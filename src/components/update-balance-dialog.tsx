
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, runTransaction, increment, collection, serverTimestamp } from 'firebase/firestore';
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
import { Separator } from './ui/separator';

const balanceSchema = z.object({
  balanceAmount: z.preprocess(
    (a) => (a === '' ? 0 : parseInt(z.string().parse(a), 10)),
    z.number().int('Amount must be an integer.').optional()
  ),
  bonusAmount: z.preprocess(
    (a) => (a === '' ? 0 : parseInt(z.string().parse(a), 10)),
    z.number().int('Amount must be an integer.').optional()
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
  const [submittingType, setSubmittingType] = useState<'real' | 'bonus' | null>(null);

  const form = useForm<BalanceFormValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      balanceAmount: 0,
      bonusAmount: 0,
    },
  });

  const handleUpdate = async (type: 'real' | 'bonus') => {
    const values = form.getValues();
    const balanceAmount = values.balanceAmount || 0;
    const bonusAmount = values.bonusAmount || 0;

    if (type === 'real' && balanceAmount === 0) {
        toast({ variant: 'destructive', title: 'No change', description: 'Please enter an amount for real balance.' });
        return;
    }
    if (type === 'bonus' && bonusAmount === 0) {
        toast({ variant: 'destructive', title: 'No change', description: 'Please enter an amount for bonus balance.' });
        return;
    }

    setSubmittingType(type);
    const userDocRef = doc(db, 'users', user.id);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    const bonusTransactionsCollectionRef = collection(db, 'bonusTransactions');

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }

            if (type === 'real') {
                const currentBalance = userDoc.data().balance || 0;
                if (currentBalance + balanceAmount < 0) {
                    throw new Error("Real balance cannot be negative.");
                }
                transaction.update(userDocRef, { balance: increment(balanceAmount) });
                transaction.update(statsDocRef, { totalBalance: increment(balanceAmount) });
            }

            if (type === 'bonus') {
                const currentBonusBalance = userDoc.data().bonusBalance || 0;
                if (currentBonusBalance + bonusAmount < 0) {
                    throw new Error("Bonus balance cannot be negative.");
                }
                
                transaction.update(userDocRef, {
                    bonusBalance: increment(bonusAmount),
                    totalBonusGiven: increment(bonusAmount > 0 ? bonusAmount : 0),
                    totalBonusUsed: increment(bonusAmount < 0 ? Math.abs(bonusAmount) : 0),
                });
                
                const newBonusTransactionRef = doc(bonusTransactionsCollectionRef);
                transaction.set(newBonusTransactionRef, {
                    userId: user.id,
                    displayName: user.displayName,
                    mobile: user.mobile,
                    amount: Math.abs(bonusAmount),
                    type: bonusAmount > 0 ? 'Given' : 'Used',
                    description: `Admin ${bonusAmount > 0 ? 'added' : 'removed'} bonus.`,
                    createdAt: serverTimestamp(),
                });
            }
        });

        toast({
            title: 'Success!',
            description: `${type === 'real' ? 'Real' : 'Bonus'} balance for ${user.displayName} updated.`,
        });
        
        form.reset({
            balanceAmount: 0,
            bonusAmount: 0,
        });

        setOpen(false);

    } catch (error: any) {
        console.error(`Error updating ${type} balance: `, error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || `Failed to update ${type} balance.`,
        });
    } finally {
        setSubmittingType(null);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Balance for {user.displayName}</DialogTitle>
          <DialogDescription>
            Enter amounts to add or remove. Use negative numbers to subtract.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4">
            <div className="rounded-md border p-4 space-y-4">
                <p className="text-sm">Current Real Balance: <span className="font-bold">₹{user.balance || 0}</span></p>
                <FormField
                  control={form.control}
                  name="balanceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add/Remove Real Balance</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100 or -50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button onClick={() => handleUpdate('real')} disabled={!!submittingType} className="w-full">
                    {submittingType === 'real' ? <Loader className="mr-2" /> : null}
                    Update Real Balance
                </Button>
            </div>
            <Separator />
            <div className="rounded-md border p-4 space-y-4">
                <p className="text-sm">Current Bonus Balance: <span className="font-bold">₹{user.bonusBalance || 0}</span></p>
                 <FormField
                  control={form.control}
                  name="bonusAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add/Remove Bonus Balance</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50 or -20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button onClick={() => handleUpdate('bonus')} disabled={!!submittingType} className="w-full">
                    {submittingType === 'bonus' ? <Loader className="mr-2" /> : null}
                    Update Bonus Balance
                </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
               <DialogClose asChild>
                <Button type="button" variant="outline">
                    Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
