
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
import { Phone, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { updateUserPassword } from '@/actions/update-user-password';

const mobileSchema = z.object({
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
});

// Main component
export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    const auth = getAuth(app);
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response: any) => {
                console.log("reCAPTCHA solved");
            },
            'expired-callback': () => {
                console.log("reCAPTCHA expired");
            }
        });
    }

    // Cleanup function
    return () => {
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
        }
    };
  }, []);


  // Step 1: Send OTP
  const onMobileSubmit = async (values: z.infer<typeof mobileSchema>) => {
    setIsSubmitting(true);
    setMobileNumber(values.mobile);
    
    try {
      // Check if user exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", values.mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No account found with this mobile number.");
      }
      
      const userDoc = querySnapshot.docs[0];
      setUserUid(userDoc.id);

      const auth = getAuth(app);
      const phoneNumber = `+91${values.mobile}`;
      const appVerifier = window.recaptchaVerifier;

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: 'An OTP has been sent to your mobile number.',
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send OTP. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and update password
  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult || !userUid) {
      toast({ variant: 'destructive', title: 'Error', description: 'Verification session expired. Please try again.' });
      setStep('mobile');
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(values.otp);
      
      // OTP is verified, now call server action to update password
      const result = await updateUserPassword({ uid: userUid, newPassword: values.newPassword });
      
      if(result.success) {
        toast({ title: 'Password Updated!', description: 'You can now log in with your new password.' });
        // After successful password reset, you might want to sign the user out from the OTP session
        const auth = getAuth(app);
        auth.signOut();
        // Redirect to login
        window.location.href = '/login';
      } else {
         throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Error verifying OTP or updating password:", error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error.message || 'Invalid OTP or failed to update password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
       <div id="recaptcha-container"></div>
      <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 backface-hidden">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-3xl font-bold text-white">Reset Password</CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'mobile' 
              ? "Enter your registered mobile number to receive an OTP."
              : `Enter the OTP sent to ${mobileNumber} and your new password.`
            }
          </CardDescription>
        </CardHeader>
        
        {step === 'mobile' ? (
          <MobileStepForm onSubmit={onMobileSubmit} isSubmitting={isSubmitting} />
        ) : (
          <OtpStepForm onSubmit={onOtpSubmit} isSubmitting={isSubmitting} />
        )}
        
        <CardFooter className="flex justify-center pb-6">
            <Link href="/login" className="text-sm text-orange-400 hover:underline">
              Back to Login
            </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

// Mobile number input form component
function MobileStepForm({ onSubmit, isSubmitting }: { onSubmit: (values: z.infer<typeof mobileSchema>) => void, isSubmitting: boolean }) {
  const form = useForm<z.infer<typeof mobileSchema>>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Mobile Number</FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <FormControl>
                    <Input type="tel" placeholder="Enter your mobile number" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" maxLength={10} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col pt-2 px-6 pb-6">
          <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500" disabled={isSubmitting}>
            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
            Send OTP
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

// OTP and New Password input form component
function OtpStepForm({ onSubmit, isSubmitting }: { onSubmit: (values: z.infer<typeof otpSchema>) => void, isSubmitting: boolean }) {
  const form = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">OTP</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Enter 6-digit OTP" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg text-center tracking-[0.5em]" maxLength={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">New Password</FormLabel>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <FormControl>
                    <Input type="password" placeholder="Enter new password" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col pt-2 px-6 pb-6">
          <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500" disabled={isSubmitting}>
            {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
            Reset Password
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
