
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile,
  signInWithCredential,
  PhoneAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, runTransaction, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { User } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }),
});

const formSchema = z.object({
  username: z.string().regex(/^[a-zA-Z\s]*$/, 'Username can only contain letters and spaces.').optional(),
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  useEffect(() => {
    // Ensure reCAPTCHA is rendered
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': (response: any) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
        });
        window.recaptchaVerifier.render().catch(err => console.error("Recaptcha render error", err));
      }
    } catch(e) {
        console.error("Error initializing recaptcha", e)
    }
  }, []);


  const sendOtp = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const phoneNumber = `+91${values.mobile}`;
      const appVerifier = window.recaptchaVerifier;

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      
      toast({
        title: 'OTP Sent!',
        description: 'An OTP has been sent to your mobile number.',
      });
      setStep('otp');

    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let errorMessage = "Error sending OTP. Please try again.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'The mobile number you entered is invalid.';
      } else if (error.code === 'auth/too-many-requests') {
          errorMessage = 'Too many requests. Please try again later.';
      }
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: errorMessage,
      });
      // Reset reCAPTCHA if it fails
      if(window.recaptchaVerifier) {
          window.recaptchaVerifier.render().then((widgetId) => {
              grecaptcha.reset(widgetId);
          });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async (values: z.infer<typeof otpSchema>) => {
      setIsSubmitting(true);
      try {
          const confirmationResult = window.confirmationResult;
          if (!confirmationResult) {
              throw new Error("Please request an OTP first.");
          }
          const userCredential = await confirmationResult.confirm(values.otp);
          const user = userCredential.user;

          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().isBlocked) {
              await auth.signOut();
              throw new Error("Your account has been blocked. Please contact support.");
          }
          
          if (!userDoc.exists()) {
              const { username, mobile } = form.getValues();
              const displayName = username || mobile;

              await updateProfile(user, { displayName });
              
              const statsDocRef = doc(db, 'app-stats', 'dashboard');
              await runTransaction(db, async (transaction) => {
                  transaction.set(userDocRef, {
                      displayName,
                      mobile: mobile,
                      email: user.email,
                      balance: 0,
                      bonusBalance: 0,
                      totalBonusGiven: 0,
                      totalBonusUsed: 0,
                      createdAt: serverTimestamp(),
                  });
                  transaction.set(statsDocRef, { totalUsers: increment(1) }, { merge: true });
              });
          }

          toast({
              title: 'Login Successful!',
              description: 'You have been successfully logged in.',
          });
          router.push('/');

      } catch (error: any) {
          console.error("Error verifying OTP:", error);
          let errorMessage = "Invalid OTP. Please try again.";
           if (error.code === 'auth/invalid-verification-code') {
              errorMessage = 'The OTP you entered is incorrect. Please try again.';
          } else if (error.code === 'auth/code-expired') {
               errorMessage = 'The OTP has expired. Please request a new one.';
           }
          toast({
              variant: 'destructive',
              title: 'Verification Failed',
              description: errorMessage,
          });
      } finally {
          setIsSubmitting(false);
      }
  };


  const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
  const description = mode === 'login' ? 'Sign in to your account' : 'Enter your details to get started.';
  const switchLinkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchLinkHref = mode === 'login' ? '/signup' : '/login';

  return (
    <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-white/10 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 rotate-x-[-20deg] hover:rotate-x-0 backface-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_20px_hsl(var(--primary))] rounded-t-2xl"></div>
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-bold text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>

      <div id="recaptcha-container"></div>

      {step === 'details' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(sendOtp)}>
            <CardContent className="space-y-6">
              {mode === 'signup' && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Enter your username" {...field} className="bg-input h-12 rounded-lg pl-10" />
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
                    <FormLabel>Mobile Number</FormLabel>
                     <div className="flex items-center">
                        <span className="inline-flex items-center px-3 h-12 rounded-l-md border border-r-0 border-input bg-input text-muted-foreground text-sm">+91</span>
                        <FormControl>
                            <Input type="tel" placeholder="Enter your mobile number" {...field} className="rounded-l-none bg-input h-12" maxLength={10} />
                        </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col pt-2">
              <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                Send OTP
              </Button>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {switchLinkText}{' '}
                <Link href={switchLinkHref} className="font-semibold text-primary hover:underline">
                  {mode === 'login' ? 'Create Account' : 'Sign In'}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      )}

      {step === 'otp' && (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(verifyOtp)}>
            <CardContent className="space-y-6">
               <Alert>
                  <AlertTitle>OTP Sent!</AlertTitle>
                  <AlertDescription>
                    We've sent a 6-digit verification code to +91 {form.getValues('mobile')}.
                  </AlertDescription>
                </Alert>
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enter OTP</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter 6-digit OTP" {...field} className="bg-input h-12 rounded-lg text-center tracking-[1em]" maxLength={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col pt-2">
              <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                Verify OTP & {mode === 'login' ? 'Login' : 'Sign Up'}
              </Button>
               <Button variant="link" onClick={() => setStep('details')} className="mt-4 text-sm text-muted-foreground">
                    Entered wrong number?
                </Button>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}
