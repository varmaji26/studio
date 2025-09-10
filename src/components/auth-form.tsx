
'use client';

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
import { doc, setDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { User, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import Link from 'next/link';

const formSchema = z.object({
  username: z.string().optional(),
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const email = `${values.mobile}@authcanvas.dev`;
    const password = values.password;

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const displayName = values.username!;
        
        await updateProfile(user, { displayName });
        
        const userDocRef = doc(db, 'users', user.uid);
        const statsDocRef = doc(db, 'app-stats', 'dashboard');

        await runTransaction(db, async (transaction) => {
            transaction.set(userDocRef, {
                uid: user.uid,
                displayName,
                mobile: values.mobile,
                email: email, // Storing the synthetic email
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
        router.push('/');

      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Successful!', description: 'Welcome back!' });
        router.push('/');
      }
    } catch (error: any) {
      console.error(`Error during ${mode}:`, error);
      let errorMessage = 'An unexpected error occurred.';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This mobile number is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid mobile number format.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid mobile number or password.';
          break;
        case 'auth/user-not-found':
            errorMessage = 'No account found with this mobile number.';
            break;
        default:
          errorMessage = error.message;
          break;
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

  const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
  const description = mode === 'login' ? 'Sign in using your mobile number and password' : 'Enter your details to get started.';
  const switchLinkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchLinkHref = mode === 'login' ? '/signup' : '/login';

  return (
    <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 backface-hidden">
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-bold text-white">{title}</CardTitle>
        <CardDescription className="text-gray-400">{description}</CardDescription>
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
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Password</FormLabel>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <FormControl>
                                    <Input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password" 
                                        {...field} 
                                        className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10 pr-10" 
                                    />
                                </FormControl>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </button>
                            </div>
                             {mode === 'login' && (
                                <div className="text-right">
                                    <Link href="/forgot-password" passHref>
                                        <span className="text-xs text-orange-400 hover:underline cursor-pointer">
                                            Forgot Password?
                                        </span>
                                    </Link>
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter className="flex flex-col pt-2 px-6 pb-6">
              <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
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
