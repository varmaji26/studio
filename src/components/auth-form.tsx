'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, runTransaction, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { User, Phone } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const formSchema = z.object({
  username: z.string().optional(),
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
  otp: z.string().optional(),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(
      formSchema.refine(
        (data) => {
          if (mode === 'signup') {
            return !!data.username && data.username.length >= 3;
          }
          return true;
        },
        {
          message: 'Username must be at least 3 characters.',
          path: ['username'],
        }
      )
    ),
    defaultValues: {
      username: '',
      mobile: '',
      otp: '',
    },
  });
  
  useEffect(() => {
    // This effect sets up the reCAPTCHA verifier when the component mounts.
    // It's crucial for this to be ready before the user clicks "Send OTP".
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        console.log("reCAPTCHA verified");
      }
    });
  }, []);

  const sendOtp = async (mobile: string, username?: string) => {
    if (mode === 'signup' && (!username || username.length < 3)) {
      form.setError('username', { type: 'manual', message: 'Username must be at least 3 characters.' });
      return;
    }
    
    setIsSubmitting(true);
    const phoneNumber = `+91${mobile}`;
    const appVerifier = window.recaptchaVerifier;

    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast({
        title: 'OTP Sent!',
        description: 'An OTP has been sent to your mobile number.',
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      toast({
        variant: 'destructive',
        title: 'OTP Send Failed',
        description: errorMessage,
      });
      // Reset reCAPTCHA if it fails
      window.recaptchaVerifier.render().then((widgetId: any) => {
          grecaptcha.reset(widgetId);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async (otp: string, mobile: string, username?: string) => {
    if (!confirmationResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please send an OTP first.' });
      return;
    }
    if (!otp || otp.length !== 6) {
        form.setError('otp', {type: 'manual', message: 'Please enter a valid 6-digit OTP.'});
        return;
    }

    setIsSubmitting(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() && mode === 'signup') {
        const displayName = username!;
        await updateProfile(user, { displayName });
        
        const statsDocRef = doc(db, 'app-stats', 'dashboard');
        
        await runTransaction(db, async (transaction) => {
             transaction.set(userDocRef, {
                uid: user.uid,
                displayName,
                mobile,
                phoneNumber: user.phoneNumber,
                balance: 0,
                bonusBalance: 0,
                totalBonusGiven: 0,
                totalBonusUsed: 0,
                createdAt: serverTimestamp(),
                isAdmin: false,
                isBlocked: false,
            });
            transaction.set(statsDocRef, { totalUsers: increment(1) }, { merge: true });
        });
        toast({ title: 'Account Created!', description: 'You have been successfully signed up.' });

      } else if (userDoc.exists() && userDoc.data().isBlocked) {
          await auth.signOut();
          toast({ variant: 'destructive', title: 'Account Blocked', description: 'Your account is blocked. Please contact support.' });
      } else {
        toast({ title: 'Login Successful!', description: 'Welcome back!' });
      }

      router.push('/');

    } catch (error: any) {
        console.error("Error verifying OTP:", error);
        toast({
            variant: 'destructive',
            title: 'OTP Verification Failed',
            description: 'The OTP you entered is incorrect. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!otpSent) {
      sendOtp(values.mobile, values.username);
    } else {
      verifyOtp(values.otp!, values.mobile, values.username);
    }
  };

  const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
  const description = otpSent ? 'Enter the OTP sent to your mobile' : (mode === 'login' ? 'Sign in using your mobile number' : 'Enter your details to get started.');
  const switchLinkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchLinkHref = mode === 'login' ? '/signup' : '/login';

  return (
    <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 backface-hidden">
      <div id="recaptcha-container"></div>
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-bold text-white">{title}</CardTitle>
        <CardDescription className="text-gray-400">{description}</CardDescription>
      </CardHeader>
      
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {!otpSent ? (
                <>
                  {mode === 'signup' && (
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input placeholder="Enter your username" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                </>
              ) : (
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
              )}
            </CardContent>
            <CardFooter className="flex flex-col pt-2 px-6 pb-6">
              <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                {otpSent ? 'Verify OTP' : 'Send OTP'}
              </Button>
              <p className="mt-6 text-center text-sm text-gray-400">
                {switchLinkText}{' '}
                <Link href={switchLinkHref} className="font-semibold text-orange-400 hover:underline">
                  {mode === 'login' ? 'Create Account' : 'Sign In'}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
    </Card>
  );
}
