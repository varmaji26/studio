
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
import { Eye, EyeOff, User } from 'lucide-react';
import React from 'react';

const formSchema = z.object({
  username: z.string().optional(),
  mobile: z.string().min(10, { message: 'Please enter a valid mobile number.' }),
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

        // Save user data and update stats in a transaction
        await runTransaction(db, async (transaction) => {
            transaction.set(userDocRef, {
                displayName: values.username,
                mobile: values.mobile,
                email: email,
                balance: 0,
                createdAt: serverTimestamp(),
            });
            transaction.set(statsDocRef, { totalUsers: increment(1) }, { merge: true });
        });

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
        const user = userCredential.user;
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          const displayName = user.displayName || values.mobile;
          await setDoc(userDocRef, {
            displayName: displayName,
            mobile: values.mobile,
            email: user.email,
            balance: 0,
            createdAt: serverTimestamp(),
          });
          // Also increment user count if a logged-in user doc is created for the first time
           const statsDocRef = doc(db, 'app-stats', 'dashboard');
           await setDoc(statsDocRef, { totalUsers: increment(1) }, { merge: true });
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
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: errorMessage,
      });
    }
  };

  const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
  const description = mode === 'login' ? 'Sign in to your account' : 'Enter your details to get started.';
  const buttonText = mode === 'login' ? 'Sign In' : 'Create Account';
  const switchLinkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchLinkHref = mode === 'login' ? '/signup' : '/login';

  return (
    <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-white/10 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 rotate-x-[-20deg] hover:rotate-x-0 backface-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_20px_hsl(var(--primary)),_0_0_40px_hsl(var(--primary))] rounded-t-2xl"></div>
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
                  <FormControl>
                    <Input type="tel" placeholder="Enter your mobile number" {...field} className="bg-input h-12 rounded-lg" />
                  </FormControl>
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
                   <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} className="bg-input h-12 rounded-lg pr-10" />
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
          <CardFooter className="flex flex-col pt-2">
            <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_theme(colors.primary/40%)]" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
              {buttonText}
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
