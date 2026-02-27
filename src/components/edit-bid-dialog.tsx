'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, DocumentData, runTransaction, increment } from 'firebase/firestore';
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
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const editBidSchema = z.object({
  numbers: z.string().min(1, 'Bid numbers are required.'),
  totalAmount: z.coerce.number().min(1, 'Amount must be at least ₹1.'),
  status: z.enum(['running', 'won', 'lost', 'cancelled']),
  winningAmount: z.coerce.number().min(0, 'Winning amount cannot be negative.'),
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
      status: bid.status,
      winningAmount: bid.winningAmount || 0,
    },
  });

  useEffect(() => {
    if (bid && open) {
        form.reset({
            numbers: bid.numbers.join(', '),
            totalAmount: bid.totalAmount,
            status: bid.status,
            winningAmount: bid.winningAmount || 0,
        });
    }
  }, [open, bid, form]);

  const onSubmit = async (values: EditBidFormValues) => {
    setIsSubmitting(true);
    
    const bidDocRef = doc(db, 'bids', bid.id);
    const userDocRef = doc(db, 'users', bid.userId);

    const newNumbers = values.numbers.split(',').map(n => n.trim()).filter(Boolean);
    const newTotalAmount = values.totalAmount;
    const oldTotalAmount = bid.totalAmount || 0;
    
    const newStatus = values.status;
    const oldStatus = bid.status;
    
    const newWinningAmount = newStatus === 'won' ? values.winningAmount : 0;
    const oldWinningAmount = bid.winningAmount || 0;

    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          throw new Error("User not found.");
        }
        
        // adjustment = refund old bet price - charge new bet price + add new win - take back old win
        const balanceAdjustment = (oldTotalAmount - newTotalAmount) + (newWinningAmount - oldWinningAmount);

        transaction.update(userDocRef, { balance: increment(balanceAdjustment) });
        
        transaction.update(bidDocRef, {
            numbers: newNumbers,
            totalAmount: newTotalAmount,
            status: newStatus,
            winningAmount: newWinningAmount,
        });
      });

      toast({
        title: 'Success!',
        description: `Bid for ${bid.displayName} has been updated and balance adjusted.`,
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

  const currentStatus = form.watch('status');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bid for {bid.displayName}</DialogTitle>
          <DialogDescription>
            Change the numbers, amount, or status. Balance will be adjusted automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numbers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bid Numbers (comma separated)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="e.g., 123, 456" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Bet Points (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="running">Running</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            {currentStatus === 'won' && (
                <FormField
                    control={form.control}
                    name="winningAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Winning Amount (₹)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

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
