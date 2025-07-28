
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Label } from './ui/label';

const withdrawalSchema = z.object({
  amount: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(10, 'Minimum withdrawal amount is ₹10.')
  ),
  withdrawalMethod: z.enum(['UPI', 'Bank Transfer', 'Paytm/PhonePe'], {
    required_error: 'You need to select a withdrawal method.',
  }),
  withdrawalDetails: z.string().min(1, 'Please enter your withdrawal details (e.g., UPI ID, Bank Account).'),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

interface WithdrawFundsDialogProps {
  user: User;
  children: React.ReactNode;
}

export function WithdrawFundsDialog({ user, children }: WithdrawFundsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: undefined,
      withdrawalMethod: undefined,
      withdrawalDetails: '',
    },
  });

  const onSubmit = async (values: WithdrawalFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
        const userDocRef = doc(db, 'users', user.uid);
        
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }
            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < values.amount) {
                throw new Error("Insufficient balance for this withdrawal.");
            }
            // We only create the request here. The balance is deducted on approval by admin.
        });

      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        displayName: user.displayName,
        amount: values.amount,
        withdrawalMethod: values.withdrawalMethod,
        withdrawalDetails: values.withdrawalDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Request Submitted!',
        description: 'Your withdrawal request has been sent for approval.',
      });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error submitting withdrawal request: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to submit request. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Enter the amount and your payment details to request a withdrawal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Withdraw (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter amount" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="withdrawalMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Withdrawal Method</FormLabel>
                   <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                        >
                            <FormItem>
                                <FormControl><RadioGroupItem value="UPI" className="peer sr-only" id="upi" /></FormControl>
                                <Label htmlFor="upi" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">UPI</Label>
                            </FormItem>
                             <FormItem>
                                <FormControl><RadioGroupItem value="Bank Transfer" className="peer sr-only" id="bank" /></FormControl>
                                <Label htmlFor="bank" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Bank</Label>
                            </FormItem>
                             <FormItem>
                                <FormControl><RadioGroupItem value="Paytm/PhonePe" className="peer sr-only" id="wallet" /></FormControl>
                                <Label htmlFor="wallet" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Wallet</Label>
                            </FormItem>
                        </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="withdrawalDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Details</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your UPI ID, Bank Account, or Phone Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                    Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                Submit Withdrawal Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
