'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import type { DocumentData } from 'firebase/firestore';

const passwordSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ChangePasswordDialogProps {
  children: React.ReactNode;
  user: DocumentData;
}

export function ChangePasswordDialog({ children, user }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '' },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateUserPassword({ uid: user.id, newPassword: values.newPassword });
      
      if (result.success) {
        toast({ title: 'Success!', description: `Password for ${user.displayName} has been changed successfully.` });
        setOpen(false);
        form.reset();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update password.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password for {user.displayName}</DialogTitle>
          <DialogDescription>
            Enter a new password for this user below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader className="mr-2" /> : null}
                        Update Password
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
