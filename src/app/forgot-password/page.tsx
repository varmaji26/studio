'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Phone, KeyRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { updateUserPassword } from '@/actions/update-user-password';
import { useRouter } from 'next/navigation';

// Window इंटरफ़ेस विस्तार
declare global {
    interface Window {
        confirmationResult?: ConfirmationResult;
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

const mobileSchema = z.object({
  mobile: z.string().length(10, { message: 'मोबाइल नंबर 10 अंकों का होना चाहिए।' }).regex(/^\d+$/, 'केवल अंक डालें।'),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP 6 अंकों का होना चाहिए।' }),
  newPassword: z.string().min(6, 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const auth = getAuth(app);

  useEffect(() => {
    // Re-captcha वेरिफ़ायर सेटअप
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
        });
    }
  }, [auth]);

  // स्टेप 1: मोबाइल नंबर चेक करें और OTP भेजें
  const onMobileSubmit = async (values: z.infer<typeof mobileSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. चेक करें कि यूजर मौजूद है या नहीं
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", values.mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("इस नंबर से कोई अकाउंट नहीं मिला। कृपया सही नंबर डालें।");
      }
      
      const userDoc = querySnapshot.docs[0];
      setUserUid(userDoc.id);
      setMobileNumber(values.mobile);

      // 2. OTP भेजें
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Recaptcha लोड नहीं हो सका।");

      const phoneNumber = `+91${values.mobile}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmation;
      
      setStep('otp');
      toast({
        title: 'OTP भेजा गया',
        description: `हमने +91 ${values.mobile} पर एक वेरिफिकेशन कोड भेजा है।`,
      });

    } catch (error: any) {
      console.error("SMS Error:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'OTP भेजने में समस्या आई। बाद में प्रयास करें।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // स्टेप 2: OTP वेरीफाई करें और पासवर्ड बदलें
  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!window.confirmationResult || !userUid) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'सत्र समाप्त हो गया है। कृपया दोबारा मोबाइल नंबर डालें।' });
      setStep('mobile');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. OTP वेरीफाई करें
      await window.confirmationResult.confirm(values.otp);
      
      // 2. सर्वर एक्शन के जरिए पासवर्ड अपडेट करें
      const result = await updateUserPassword({ uid: userUid, newPassword: values.newPassword });
      
      if(result.success) {
        toast({ 
            title: 'सफलता!', 
            description: 'आपका पासवर्ड बदल दिया गया है। अब आप नए पासवर्ड से लॉगिन कर सकते हैं।',
            className: 'bg-green-600 text-white' 
        });
        router.replace('/login');
      } else {
         throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      let msg = 'गलत OTP कोड। कृपया दोबारा जांचें।';
      if (error.code === 'auth/code-expired') msg = 'OTP की समय सीमा समाप्त हो गई है।';
      
      toast({
        variant: 'destructive',
        title: 'विफल',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-4 border-orange-500 rounded-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6 text-orange-500" />
            पासवर्ड रिसेट
          </CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'mobile' 
              ? "अपना रजिस्टर्ड मोबाइल नंबर डालें"
              : `OTP कोड डालें जो ${mobileNumber} पर भेजा गया है`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
            {step === 'mobile' ? (
                <Form {...formMobile}>
                    <form onSubmit={formMobile.handleSubmit(onMobileSubmit)} className="space-y-4">
                        <FormField
                            control={formMobile.control}
                            name="mobile"
                            render={({ field }) => (
                            <FormItem>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <FormControl>
                                        <Input type="tel" placeholder="मोबाइल नंबर (10 अंक)" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 pl-10" maxLength={10} />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2" /> : null}
                            OTP भेजें
                        </Button>
                    </form>
                </Form>
            ) : (
                <Form {...formOtp}>
                    <form onSubmit={formOtp.handleSubmit(onOtpSubmit)} className="space-y-4">
                        <FormField
                            control={formOtp.control}
                            name="otp"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white text-xs">OTP कोड</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="XXXXXX" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 text-center text-xl tracking-[0.5em]" maxLength={6} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={formOtp.control}
                            name="newPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white text-xs">नया पासवर्ड</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="कम से कम 6 अक्षर" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2" /> : null}
                            पासवर्ड बदलें
                        </Button>
                        <Button variant="link" className="w-full text-orange-400" onClick={() => setStep('mobile')} disabled={isSubmitting}>
                            नंबर बदलें
                        </Button>
                    </form>
                </Form>
            )}
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/10 pt-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> वापस लॉगिन पर जाएँ
            </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

// हेल्पर फॉर्म हुक
function useFormMobile() {
    return useForm<z.infer<typeof mobileSchema>>({
        resolver: zodResolver(mobileSchema),
        defaultValues: { mobile: '' },
    });
}

function useFormOtp() {
    return useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '', newPassword: '' },
    });
}

// React Hook Form के लिए अलग-अलग वेरिएबल
const formMobile = { ...useFormMobile() };
const formOtp = { ...useFormOtp() };
