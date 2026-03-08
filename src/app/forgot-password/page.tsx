'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
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

// Extension for window object to hold recaptcha and confirmation
declare global {
    interface Window {
        confirmationResult?: ConfirmationResult;
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

const mobileSchema = z.object({
  mobile: z.string().length(10, { message: 'Mobile number must be 10 digits.' }).regex(/^\d+$/, 'Numbers only.'),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }),
  newPassword: z.string().min(6, 'Minimum 6 characters.'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');

  const formMobile = useForm<z.infer<typeof mobileSchema>>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '' },
  });

  const formOtp = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
        });
    }
  }, []);

  const onMobileSubmit = async (values: z.infer<typeof mobileSchema>) => {
    setIsSubmitting(true);
    try {
      // 1. Check if user exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", values.mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No account found with this number.");
      }
      
      const userDoc = querySnapshot.docs[0];
      setUserUid(userDoc.id);
      setMobileNumber(values.mobile);

      // 2. Trigger Phone OTP
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Recaptcha failed to load.");

      const phoneNumber = `+91${values.mobile}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmation;
      
      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: `Verification code sent to +91 ${values.mobile}`,
      });

    } catch (error: any) {
      console.error("SMS Error:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send OTP. Try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!window.confirmationResult || !userUid) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please restart the process.' });
      setStep('mobile');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify OTP
      await window.confirmationResult.confirm(values.otp);
      
      // 2. Update password via Server Action
      const result = await updateUserPassword({ uid: userUid, newPassword: values.newPassword });
      
      if(result.success) {
        toast({ 
            title: 'Success!', 
            description: 'Password changed. Please login with your new password.',
            className: 'bg-green-600 text-white' 
        });
        router.replace('/login');
      } else {
         throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      let msg = 'Invalid OTP. Please check and try again.';
      if (error.code === 'auth/code-expired') msg = 'OTP expired.';
      
      toast({
        variant: 'destructive',
        title: 'Failed',
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
            Reset Password
          </CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'mobile' 
              ? "Enter your registered mobile number"
              : `Enter the 6-digit OTP sent to ${mobileNumber}`
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
                                        <Input type="tel" placeholder="Mobile Number" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 pl-10" maxLength={10} />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                            Send OTP
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
                                <FormLabel className="text-white text-xs">OTP Code</FormLabel>
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
                                <FormLabel className="text-white text-xs">New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Min 6 characters" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                            Update Password
                        </Button>
                        <Button variant="link" className="w-full text-orange-400" onClick={() => setStep('mobile')} disabled={isSubmitting}>
                            Change Number
                        </Button>
                    </form>
                </Form>
            )}
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/10 pt-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
