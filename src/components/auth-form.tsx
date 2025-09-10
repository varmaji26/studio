
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, runTransaction, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { User, KeyRound } from 'lucide-react';
import React, { useState } from 'react';

const formSchema = z.object({
  username: z.string().optional(),
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
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
      password: '',
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const email = `${values.mobile}@matkaking.com`;
    
    try {
        if (mode === 'signup') {
            // Signup logic
            const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
            const user = userCredential.user;
            const displayName = values.username || values.mobile;
            await updateProfile(user, { displayName });

            const userDocRef = doc(db, 'users', user.uid);
            const statsDocRef = doc(db, 'app-stats', 'dashboard');
            
            await runTransaction(db, async (transaction) => {
                 transaction.set(userDocRef, {
                    uid: user.uid,
                    displayName,
                    mobile: values.mobile,
                    email: email,
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

             toast({
                title: 'Account Created!',
                description: 'You have been successfully signed up.',
            });
            router.push('/');

        } else {
            // Login logic
            const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().isBlocked) {
                await auth.signOut();
                toast({
                    variant: 'destructive',
                    title: 'Account Blocked',
                    description: 'Your account has been blocked. Please contact support.',
                });
            } else {
                toast({
                    title: 'Login Successful!',
                    description: 'Welcome back!',
                });
                router.push('/');
            }
        }
    } catch (error: any) {
        console.error(`Error during ${mode}:`, error);
        let errorMessage = `An error occurred. Please try again.`;
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this mobile number already exists.';
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid mobile number or password.';
        }
        toast({
            variant: 'destructive',
            title: `${mode === 'login' ? 'Login' : 'Signup'} Failed`,
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const title = mode === 'login' ? 'Sign In' : 'Create an Account';
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
      
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
               <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input type="password" placeholder="Enter your password" {...field} className="bg-input h-12 rounded-lg pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
            <CardFooter className="flex flex-col pt-2">
              <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
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
    </Card>
  );
}
