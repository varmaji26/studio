
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
import { Card, CardContent } from './ui/card';
import { Label } from '@/components/ui/label';

const addPointsSchema = z.object({
  amount: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(10, 'Minimum deposit amount is ₹10.')
  ),
  paymentMethod: z.enum(['UPI', 'Bank Transfer', 'Paytm/PhonePe'], {
    required_error: 'You need to select a payment method.',
  }),
  transactionId: z.string().min(1, 'Transaction ID is required.'),
});

type AddPointsFormValues = z.infer<typeof addPointsSchema>;

interface AddPointsDialogProps {
  user: User;
  children: React.ReactNode;
}

const paymentDetails = {
    UPI: { title: "UPI Payment", details: "Pay using UPI ID: admin@paytm" },
    'Bank Transfer': { title: "Bank Transfer", details: "Account: 1234567890, IFSC: SBIN0001234" },
    'Paytm/PhonePe': { title: "Paytm/PhonePe", details: "Mobile: +91 9876543210" },
};


export function AddPointsDialog({ user, children }: AddPointsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddPointsFormValues>({
    resolver: zodResolver(addPointsSchema),
  });

  const onSubmit = async (values: AddPointsFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'deposits'), {
        userId: user.uid,
        displayName: user.displayName,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        transactionId: values.transactionId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Request Submitted!',
        description: 'Your deposit request has been sent for approval.',
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error submitting deposit request: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
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
          <DialogTitle>Add Points</DialogTitle>
          <DialogDescription>
            Complete the payment using the details below and submit your request.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter amount (Min: ₹10)" {...field} onChange={e => field.onChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Select Payment Method</FormLabel>
                   <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      {Object.keys(paymentDetails).map((method) => (
                         <FormItem key={method}>
                           <FormControl>
                            <RadioGroupItem value={method} className="peer sr-only" id={method} />
                           </FormControl>
                           <Label htmlFor={method} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                {paymentDetails[method as keyof typeof paymentDetails].title}
                           </Label>
                         </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('paymentMethod') && (
                <Card className="bg-muted/50">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold">{paymentDetails[form.watch('paymentMethod') as keyof typeof paymentDetails].title}</p>
                        <p className="text-sm text-muted-foreground">{paymentDetails[form.watch('paymentMethod') as keyof typeof paymentDetails].details}</p>
                    </CardContent>
                </Card>
            )}

            <FormField
              control={form.control}
              name="transactionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter transaction ID after payment" {...field} />
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
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
