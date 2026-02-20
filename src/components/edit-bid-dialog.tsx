
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, DocumentData, runTransaction, increment } from 'firebase/firestore';
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

const editBidSchema = z.object({
  numbers: z.string().min(1, 'Bid numbers are required.'),
  totalAmount: z.coerce.number().min(1, 'Amount must be at least ₹1.'),
});

type EditBidFormValues = z.infer<typeof editBidSchema>;

interface EditBidDialogProps {
  bid: DocumentData;
  children?: React.ReactNode;
  onBidUpdate: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditBidDialog({ bid, children, onBidUpdate, open: openProp, onOpenChange: setOpenProp }: EditBidDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = setOpenProp ?? setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditBidFormValues>({
    resolver: zodResolver(editBidSchema),
    defaultValues: {
      numbers: bid.numbers.join(', '),
      totalAmount: bid.totalAmount,
    },
  });

  useEffect(() => {
    if (open) {
        form.reset({
            numbers: bid.numbers.join(', '),
            totalAmount: bid.totalAmount,
        });
    }
  }, [open, bid, form]);

  const onSubmit = async (values: EditBidFormValues) => {
    setIsSubmitting(true);
    
    const bidDocRef = doc(db, 'bids', bid.id);
    const userDocRef = doc(db, 'users', bid.userId);

    const newNumbers = values.numbers.split(',').map(n => n.trim()).filter(Boolean);
    const newTotalAmount = values.totalAmount;
    const oldTotalAmount = bid.totalAmount;
    const amountDifference = newTotalAmount - oldTotalAmount;

    try {
      await runTransaction(db, async (transaction) => {
        if (amountDifference !== 0) {
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error("User not found.");
          }
          const userBalance = userDoc.data().balance || 0;
          if (amountDifference > 0 && userBalance < amountDifference) {
            throw new Error("User has insufficient balance for this amount increase.");
          }
          transaction.update(userDocRef, { balance: increment(-amountDifference) });
        }
        
        transaction.update(bidDocRef, {
            numbers: newNumbers,
            totalAmount: newTotalAmount,
        });
      });

      toast({
        title: 'Success!',
        description: `Bid for ${bid.displayName} has been updated.`,
      });
      onBidUpdate();
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating bid: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update bid. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bid for {bid.displayName}</DialogTitle>
          <DialogDescription>
            Change the numbers or amount for this bid. This action is final.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numbers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bid Numbers</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 123, 456" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
