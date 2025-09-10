
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Phone } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const email = `${values.mobile}@authcanvas.dev`;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${values.mobile}, you will receive an email with instructions to reset your password.`,
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      // We show a generic message even on error to prevent user enumeration
       toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${values.mobile}, you will receive an email with instructions to reset your password.`,
      });
       setEmailSent(true);
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
            {emailSent 
              ? "Check your email inbox (and spam folder) for the reset link."
              : "Enter your registered mobile number to receive a password reset link."
            }
          </CardDescription>
        </CardHeader>
        
        {!emailSent ? (
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
                    Send Reset Link
                </Button>
                </CardFooter>
            </form>
            </Form>
        ) : (
             <CardContent>
                <p className="text-center text-green-400">
                    Your request has been processed. Please follow the instructions sent to your email.
                </p>
            </CardContent>
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
