
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, runTransaction, increment } from 'firebase/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { DocumentData } from 'firebase/firestore';

const balanceSchema = z.object({
  amount: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int('Amount must be an integer.')
  ),
});

type BalanceFormValues = z.infer<typeof balanceSchema>;

interface UpdateBalanceDialogProps {
  user: DocumentData;
  children: React.ReactNode;
}

export function UpdateBalanceDialog({ user, children }: UpdateBalanceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BalanceFormValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const onSubmit = async (values: BalanceFormValues) => {
    setIsSubmitting(true);
    const userDocRef = doc(db, 'users', user.id);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        const newBalance = currentBalance + values.amount;

        if (newBalance < 0) {
            throw new Error("Balance cannot be negative.");
        }

        transaction.update(userDocRef, { balance: newBalance });
        transaction.update(statsDocRef, { totalBalance: increment(values.amount) });
      });

      toast({
        title: 'Success!',
        description: `Balance for ${user.displayName} updated successfully.`,
      });
      form.reset();
      setOpen(false);

    } catch (error: any) {
      console.error('Error updating balance: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update balance. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Balance for {user.displayName}</DialogTitle>
          <DialogDescription>
            Enter the amount to add or remove. Use a negative number to remove balance.
            Current Balance: ₹{user.balance || 0}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Add/Remove</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 100 or -50" {...field} />
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
                Update Balance
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
