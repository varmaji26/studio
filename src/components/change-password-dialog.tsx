
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
import { updateUserPassword } from '@/actions/update-user-password';
import { Phone, KeyRound } from 'lucide-react';
import type { User as FirebaseAuthUser } from 'firebase/auth';

declare global {
    interface Window {
        confirmationResult?: ConfirmationResult;
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
});

interface ChangePasswordDialogProps {
  children: React.ReactNode;
  user: FirebaseAuthUser | null;
  mobileNumber: string;
}

export function ChangePasswordDialog({ children, user, mobileNumber }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'initial' | 'otp'>('initial');
  const auth = getAuth(app);

  useEffect(() => {
    if (open && !window.recaptchaVerifier) {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {},
      });
      window.recaptchaVerifier = recaptchaVerifier;
    }
  }, [open, auth]);
  
  const handleSendOtp = async () => {
    setIsSubmitting(true);
    try {
        const appVerifier = window.recaptchaVerifier!;
        const phoneNumber = `+91${mobileNumber}`;
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.confirmationResult = confirmation;
        setStep('otp');
        toast({ title: 'OTP Sent', description: 'An OTP has been sent to your mobile number.' });
    } catch (error: any) {
        console.error("Error sending OTP:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send OTP. Please try again later.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const form = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  const onOtpSubmit = async (values: z.infer<typeof otpSchema>) => {
    if (!window.confirmationResult || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Verification session expired. Please try again.' });
      setStep('initial');
      return;
    }
    setIsSubmitting(true);
    try {
      await window.confirmationResult.confirm(values.otp);
      
      const result = await updateUserPassword({ uid: user.uid, newPassword: values.newPassword });
      
      if(result.success) {
        toast({ title: 'Password Updated!', description: 'Your password has been changed successfully.' });
        setOpen(false);
        setStep('initial');
        form.reset();
      } else {
         throw new Error(result.message);
      }
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
        if (error.code === 'auth/invalid-verification-code' || error.code === 'auth/invalid-credential') {
            errorMessage = 'The OTP you entered is incorrect. Please try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }
      toast({ variant: 'destructive', title: 'Failed', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <div id="recaptcha-container"></div>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            {step === 'initial'
              ? 'A confirmation OTP will be sent to your registered mobile number.'
              : `Enter the OTP sent to ${mobileNumber} and your new password.`}
          </DialogDescription>
        </DialogHeader>
        {step === 'initial' ? (
          <div className="py-4">
            <p>Click the button below to send an OTP to your mobile number <strong>{mobileNumber}</strong>.</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onOtpSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTP</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter 6-digit OTP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
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
            </form>
          </Form>
        )}
        <DialogFooter>
          {step === 'initial' ? (
            <Button onClick={handleSendOtp} disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2" /> : null}
              Send OTP
            </Button>
          ) : (
            <Button onClick={form.handleSubmit(onOtpSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <Loader className="mr-2" /> : null}
              Update Password
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
