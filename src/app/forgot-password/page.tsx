'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Phone, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { updateUserPassword } from '@/actions/update-user-password';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const mobileSchema = z.object({
  mobile: z.string().length(10, { message: 'Mobile number must be 10 digits.' }).regex(/^\d+$/, 'Numbers only.'),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }).regex(/^\d+$/, 'OTP must be numeric.'),
  newPassword: z.string().min(6, 'Minimum 6 characters.'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [userUid, setUserUid] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  
  // Refs to manage recaptcha lifecycle
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const formMobile = useForm<z.infer<typeof mobileSchema>>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '' },
  });

  const formOtp = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  // Pre-fill mobile number if user is logged in
  useEffect(() => {
    if (user?.email) {
      const mobile = user.email.split('@')[0];
      if (mobile && /^\d{10}$/.test(mobile)) {
        formMobile.setValue('mobile', mobile);
      }
    }
  }, [user, formMobile]);

  // Aggressive cleanup of OTP field when switching steps
  useEffect(() => {
    if (step === 'otp') {
        const timer = setTimeout(() => {
            formOtp.setValue('otp', '', { shouldValidate: false });
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [step, formOtp]);

  const initRecaptcha = () => {
    const container = document.getElementById('recaptcha-container');
    if (!container) return null;

    try {
        if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
                'size': 'invisible',
                'callback': () => {},
                'expired-callback': () => {
                    recaptchaVerifierRef.current = null;
                }
            });
        }
        return recaptchaVerifierRef.current;
    } catch (error) {
        console.error("Recaptcha Init Error:", error);
        return null;
    }
  };

  const onMobileSubmit = async (values: z.infer<typeof mobileSchema>) => {
    setIsSubmitting(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", values.mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No account found with this number.");
      }
      
      const userDoc = querySnapshot.docs[0];
      const uid = userDoc.id;

      const verifier = initRecaptcha();
      if (!verifier) throw new Error("Captcha initialization failed. Please refresh.");

      const phoneNumber = `+91${values.mobile}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      
      // Store confirmation result globally temporarily
      (window as any).confirmationResult = confirmation;
      
      setUserUid(uid);
      setMobileNumber(values.mobile);
      setStep('otp');
      
      toast({
        title: 'OTP Sent',
        description: `Verification code sent to +91 ${values.mobile}`,
      });

    } catch (error: any) {
      console.error("SMS Error:", error);
      let message = error.message || 'Failed to send OTP. Try again later.';
      if (error.code === 'auth/too-many-requests') {
          message = 'Too many requests. Please wait 15-20 minutes.';
      } else if (error.code === 'auth/invalid-phone-number') {
          message = 'The mobile number entered is wrong or invalid.';
      }
      
      toast({ variant: 'destructive', title: 'Error', description: message });
      recaptchaVerifierRef.current = null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    const confirmationResult = (window as any).confirmationResult;
    
    if (!confirmationResult || !userUid) {
      toast({ variant: 'destructive', title: 'Session Expired', description: 'Please restart the process.' });
      setStep('mobile');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(values.otp);
      
      const result = await updateUserPassword({ uid: userUid, newPassword: values.newPassword });
      
      if(result.success) {
        toast({ title: 'Success!', description: 'Password changed successfully.', className: 'bg-green-600 text-white' });
        (window as any).confirmationResult = undefined;
        router.replace(user ? '/' : '/login');
      } else {
         throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Verification Error:", error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Invalid OTP code. Please check and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div id="recaptcha-container"></div>
      
      <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-4 border-orange-500 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6 text-orange-500" />
            {user ? "Change Password" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'mobile' 
              ? (user ? "Confirm your registered number" : "Enter registered mobile number")
              : `Enter 6-digit OTP sent to ${mobileNumber}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="animate-in fade-in zoom-in-95 duration-300">
            {step === 'mobile' ? (
                <Form {...formMobile}>
                    <form onSubmit={formMobile.handleSubmit(onMobileSubmit)} className="space-y-4" autoComplete="off">
                        <FormField
                            control={formMobile.control}
                            name="mobile"
                            render={({ field }) => (
                            <FormItem>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <FormControl>
                                        <Input 
                                            type="tel" 
                                            placeholder="Mobile Number" 
                                            {...field} 
                                            className={cn(
                                                "bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10",
                                                user && "opacity-80 cursor-not-allowed select-none border-green-500/50"
                                            )} 
                                            maxLength={10} 
                                            autoComplete="tel" 
                                            readOnly={!!user}
                                        />
                                    </FormControl>
                                    {user && <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold text-lg rounded-xl transition-all" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                            Send OTP
                        </Button>
                    </form>
                </Form>
            ) : (
                <Form {...formOtp}>
                    <form onSubmit={formOtp.handleSubmit(onOtpSubmit)} className="space-y-4" autoComplete="off">
                        <div key="otp-wrapper" className="space-y-4">
                            <FormField
                                control={formOtp.control}
                                name="otp"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white text-xs">OTP Code</FormLabel>
                                    <FormControl>
                                        <Input 
                                            id="otp-verification-input-unique"
                                            type="text" 
                                            inputMode="numeric"
                                            placeholder="Enter OTP" 
                                            {...field} 
                                            className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-14 text-center text-2xl font-black tracking-widest rounded-xl focus:ring-2 focus:ring-orange-500" 
                                            maxLength={6} 
                                            autoComplete="one-time-code"
                                            onFocus={(e) => e.target.select()}
                                        />
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
                                        <Input 
                                            type="password" 
                                            placeholder="Min 6 characters" 
                                            {...field} 
                                            className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-xl" 
                                            autoComplete="new-password"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl" disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                            Change Password
                        </Button>
                        <Button variant="link" className="w-full text-orange-400 text-xs" onClick={() => setStep('mobile')} disabled={isSubmitting}>
                            Change number? Go back
                        </Button>
                    </form>
                </Form>
            )}
        </CardContent>
        
        <CardFooter className="justify-center border-t border-white/10 pt-4 pb-6">
            <Link href={user ? "/" : "/login"} className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to {user ? "Home" : "Login"}
            </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
