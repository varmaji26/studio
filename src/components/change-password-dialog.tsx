
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { RecaptchaVerifier, signInWithPhoneNumber, updatePassword, PhoneAuthProvider, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits.'),
});

const passwordSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


interface ChangePasswordDialogProps {
  children: React.ReactNode;
  mobileNumber: string;
}

export function ChangePasswordDialog({ children, mobileNumber }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'send_otp' | 'verify_otp' | 'set_password'>('send_otp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!open) {
        // Reset state when dialog closes
        setStep('send_otp');
        setIsSubmitting(false);
        setConfirmationResult(null);
        setIsRecaptchaVerified(false);
        otpForm.reset();
        passwordForm.reset();
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
        }
    }
  }, [open, otpForm, passwordForm]);
  
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal',
            'callback': (response: any) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                setIsRecaptchaVerified(true);
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
                setIsRecaptchaVerified(false);
            }
        });
        window.recaptchaVerifier.render(); // Render the reCAPTCHA
    }
    return window.recaptchaVerifier;
  }
  
  useEffect(() => {
    if (open && step === 'send_otp') {
        // slight delay to ensure the container is in the DOM
        setTimeout(() => setupRecaptcha(), 100); 
    }
  }, [open, step]);


  const handleSendOtp = async () => {
    setIsSubmitting(true);
    try {
      const fullPhoneNumber = `+91${mobileNumber}`;
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        throw new Error("reCAPTCHA not initialized.");
      }
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('verify_otp');
      toast({ title: 'OTP Sent', description: 'An OTP has been sent to your mobile number.' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send OTP. Please try again.' });
       if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      setIsRecaptchaVerified(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async (values: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setIsSubmitting(true);
    try {
      await confirmationResult.confirm(values.otp);
      setStep('set_password');
      toast({ title: 'Verification Successful', description: 'Please set your new password.' });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The OTP you entered is incorrect.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSetPassword = async (values: z.infer<typeof passwordSchema>) => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await updatePassword(auth.currentUser, values.newPassword);
      toast({ title: 'Success!', description: 'Your password has been changed successfully.' });
      setOpen(false);
    } catch (error) {
      console.error('Error updating password:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update password. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
           <DialogDescription>
            {step === 'send_otp' && 'Please verify reCAPTCHA and then we will send a verification code to your registered mobile number.'}
            {step === 'verify_otp' && 'Please enter the 6-digit code sent to your mobile.'}
            {step === 'set_password' && 'Enter your new password.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'send_otp' && (
            <div className="space-y-4">
                <p>A one-time password (OTP) will be sent to: <strong>+91 {mobileNumber}</strong></p>
                <div id="recaptcha-container" className="my-4 flex justify-center"></div>
                <Button onClick={handleSendOtp} disabled={isSubmitting || !isRecaptchaVerified} className="w-full">
                    {isSubmitting && <Loader className="mr-2"/>}
                    Send OTP
                </Button>
            </div>
        )}

        {step === 'verify_otp' && (
            <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                    <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>OTP Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter 6-digit OTP" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="mr-2" /> : null}
                        Verify OTP
                    </Button>
                    </DialogFooter>
                </form>
            </Form>
        )}

        {step === 'set_password' && (
             <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSetPassword)} className="space-y-4">
                    <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="mr-2" /> : null}
                        Update Password
                    </Button>
                    </DialogFooter>
                </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Add this to your global types or a suitable declaration file if you don't have one
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}
