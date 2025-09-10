
'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Phone, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';

const forgotPasswordSchema = z.object({
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      mobile: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsSubmitting(true);
    const email = `${values.mobile}@authcanvas.dev`;

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset Link Sent!',
        description: 'A password reset link has been sent to the email associated with your mobile number. Please check your inbox.',
      });
      form.reset();
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      let errorMessage = 'An error occurred. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this mobile number.';
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
      <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl transition-all duration-500 hover:shadow-primary/20 animate-in fade-in-0 slide-in-from-bottom-10 backface-hidden">
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-3xl font-bold text-white">Forgot Password</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your mobile number to receive a reset link.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Mobile Number</FormLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Enter your registered mobile number"
                          {...field}
                          className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10"
                          maxLength={10}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col pt-2 px-6 pb-6 gap-4">
              <Button
                type="submit"
                className="w-full h-12 rounded-lg text-lg font-bold bg-orange-400 text-black hover:bg-orange-500"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader className="mr-2 h-5 w-5" />}
                Send Reset Link
              </Button>
              <Link href="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}
