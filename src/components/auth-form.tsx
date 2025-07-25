
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { Phone, Lock } from 'lucide-react';

const formSchema = z.object({
  mobile: z.string().min(10, { message: 'Please enter a valid mobile number.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: '',
      password: '',
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Firebase's email/password auth requires an email format.
      // We'll create a fake email from the mobile number to use the feature.
      const email = `${values.mobile.replace(/\s/g, '')}@authcanvas.dev`;

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, values.password);
      } else {
        await signInWithEmailAndPassword(auth, email, values.password);
      }
      router.push('/');
      toast({
        title: 'Success!',
        description: mode === 'signup' ? 'Your account has been created.' : 'You are now logged in.',
      });
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
  const description = mode === 'login' ? 'Sign in with your mobile number.' : 'Enter your details to get started.';
  const buttonText = mode === 'login' ? 'Login' : 'Sign Up';
  const switchLinkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchLinkHref = mode === 'login' ? '/signup' : '/login';

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="tel" placeholder="+1 123 456 7890" {...field} className="pl-10" />
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
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2 h-4 w-4" /> : null}
              {buttonText}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {switchLinkText}{' '}
              <Link href={switchLinkHref} className="font-semibold text-primary hover:underline">
                {mode === 'login' ? 'Sign up' : 'Login'}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
