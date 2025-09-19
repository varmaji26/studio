
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, runTransaction, increment } from 'firebase/firestore';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { Eye, EyeOff, User, Phone, KeyRound } from 'lucide-react';
import React from 'react';

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
  const [showPassword, setShowPassword] = React.useState(false);

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

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const email = `${values.mobile.replace(/\s/g, '')}@authcanvas.dev`;

      if (mode === 'signup') {
        if (!values.username) {
            toast({
                variant: 'destructive',
                title: 'Authentication Failed',
                description: 'Please enter a username.',
            });
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
        await updateProfile(userCredential.user, {
            displayName: values.username
        });
        
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const statsDocRef = doc(db, 'app-stats', 'dashboard');
        
        await runTransaction(db, async (transaction) => {
            // First, create the user document
            transaction.set(userDocRef, {
                uid: userCredential.user.uid,
                displayName: values.username,
                mobile: values.mobile,
                email: email,
                balance: 0,
                bonusBalance: 0,
                totalBonusGiven: 0,
                isAdmin: false,
                isBlocked: false,
                createdAt: serverTimestamp(),
            });

            // Then, read the stats doc and update it
            const statsDoc = await transaction.get(statsDocRef);
            if (statsDoc.exists()) {
                transaction.update(statsDocRef, { totalUsers: increment(1) });
            } else {
                transaction.set(statsDocRef, { totalUsers: 1 }, { merge: true });
            }
        });

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().isBlocked) {
            await auth.signOut();
            throw new Error("Your account has been blocked. Please contact support.");
        }
      }
      router.push('/');
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message || 'An unexpected error occurred.';
      if (error.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid mobile number.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid mobile number or password.';
      } else if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'An account with this mobile number already exists.';
      } else if (error.code === 'auth/user-disabled') {
          errorMessage = 'Your account has been disabled. Please contact support.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: errorMessage,
      });
    }
  };

  const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
  const description = mode === 'login' ? 'Sign in using your mobile number and password' : 'Enter your details to get started.';
  const buttonText = mode === 'login' ? 'Sign In' : 'Create Account';
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
                      <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10 pr-10" />
                    </FormControl>
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col pt-2 px-6 pb-6">
            <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
              {buttonText}
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
