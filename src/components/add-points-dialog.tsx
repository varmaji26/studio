
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { type User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, DocumentData } from 'firebase/firestore';
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
import { Skeleton } from './ui/skeleton';
import Image from 'next/image';

const addPointsSchema = z.object({
  amount: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(10, 'Minimum deposit amount is ₹10.')
  ),
  paymentMethod: z.enum(['UPI', 'Bank Transfer', 'Paytm/PhonePe', 'Scan QR Code'], {
    required_error: 'You need to select a payment method.',
  }),
  transactionId: z.string().min(1, 'Transaction ID is required.'),
});

type AddPointsFormValues = z.infer<typeof addPointsSchema>;

interface AddPointsDialogProps {
  user: User;
  children: React.ReactNode;
}

type PaymentDetails = {
    [key: string]: {
        title: string;
        details?: string;
        imageUrl?: string;
    }
}

export function AddPointsDialog({ user, children }: AddPointsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  const form = useForm<AddPointsFormValues>({
    resolver: zodResolver(addPointsSchema),
    defaultValues: {
      amount: undefined,
      paymentMethod: undefined,
      transactionId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    
    setLoadingDetails(true);
    const settingsDocRef = doc(db, 'settings', 'app-settings');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as DocumentData;
            setPaymentDetails(data.paymentDetails || {});
        } else {
            setPaymentDetails({});
        }
        setLoadingDetails(false);
    }, (error) => {
        console.error("Error fetching payment details: ", error);
        setLoadingDetails(false);
    });

    return () => unsubscribe();

  }, [open]);

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

  const selectedMethod = form.watch('paymentMethod');
  const selectedPaymentDetail = selectedMethod && paymentDetails ? paymentDetails[selectedMethod] : null;

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
                    <Input type="number" placeholder="Enter amount (Min: ₹10)" {...field} onChange={e => field.onChange(e.target.value)} value={field.value || ''} />
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
                    {loadingDetails ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                          {paymentDetails && Object.keys(paymentDetails).map((method) => {
                            const detail = paymentDetails[method as keyof typeof paymentDetails];
                            if (!detail.details && !detail.imageUrl) return null; // Don't show if no details or QR
                            return (
                             <FormItem key={method}>
                               <FormControl>
                                <RadioGroupItem value={method} className="peer sr-only" id={method} />
                               </FormControl>
                               <Label htmlFor={method} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                    {detail.title}
                               </Label>
                             </FormItem>
                            )
                          })}
                        </RadioGroup>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPaymentDetail && (
                <Card className="bg-muted/50">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold">{selectedPaymentDetail.title}</p>
                        {selectedPaymentDetail.details && (
                             <p className="text-sm text-muted-foreground break-words">{selectedPaymentDetail.details}</p>
                        )}
                        {selectedPaymentDetail.imageUrl && (
                            <div className="mt-2 flex justify-center">
                                <Image src={selectedPaymentDetail.imageUrl} alt="Payment QR Code" width={200} height={200} className="rounded-md" />
                            </div>
                        )}
                        { !selectedPaymentDetail.details && !selectedPaymentDetail.imageUrl && (
                             <p className="text-sm text-muted-foreground">Details not available.</p>
                        )}
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
              <Button type="submit" disabled={isSubmitting || loadingDetails}>
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
