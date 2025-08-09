
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
import { ScrollArea } from './ui/scroll-area';

const addPointsSchema = z.object({
  amount: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(100, 'Minimum deposit amount is ₹100.')
  ),
  paymentMethod: z.enum(['UPI', 'Bank Transfer', 'Paytm/PhonePe'], {
    required_error: 'You need to select a payment method.',
  }),
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

const UpiLogo = () => (
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.33333 5.33333H16.6667V7.33333H12.6667V12H14C15.8409 12 17.3333 13.4924 17.3333 15.3333C17.3333 17.1742 15.8409 18.6667 14 18.6667H7.33333V5.33333Z" fill="#2F69FF"/>
        <path d="M7.33333 12H9.33333V16.6667H7.33333V12Z" fill="#FFA500"/>
        <path d="M10.6667 12H12.6667V16.6667C12.6667 16.1144 12.8774 15.5835 13.2523 15.2085C13.6273 14.8335 14.1582 14.623 14.7104 14.623H14C13.5684 14.623 13.1413 14.5447 12.74 14.39" fill="#00BFFF"/>
        <path d="M12.6667 7.33333H10.6667V12H12.6667V7.33333Z" fill="#32CD32"/>
    </svg>
);

const BankLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 10H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 14H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 18H7C5.89543 18 5 17.1046 5 16V8C5 6.89543 5.89543 6 7 6H17C18.1046 6 19 6.89543 19 8V16C19 17.1046 18.1046 18 17 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 6V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const PaytmPhonePeLogo = () => (
     <svg width="60" height="28" viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M46.51,14.08C46.51,13,46.42,12,46.25,11.05H36.31V16.2H42.1C41.83,18.06,40.71,19.57,38.9,20.66V23.91H43.19C45.3,21.91,46.51,18.33,46.51,14.08Z" fill="#4285F4"/>
        <path d="M36.31,25C39.4,25,41.97,23.94,43.83,22.2L39.55,18.94C38.07,19.95,36.7,20.5,34.9,20.5C31.62,20.5,28.89,18.28,27.9,15.42H23.5V18.78C25.36,22.5,30.34,25,36.31,25Z" fill="#34A853"/>
        <path d="M27.9,15.42C27.64,14.5,27.46,13.52,27.46,12.5C27.46,11.48,27.64,10.5,27.89,9.58V6.22H23.5C22.2,8.8,21.5,11.52,21.5,14.5C21.5,17.48,22.2,20.2,23.5,22.78L27.9,19.42V15.42Z" fill="#FBBC05"/>
        <path d="M36.31,4.5C39.69,4.5,42.3,5.65,44.42,7.63L40.14,11.91C38.66,10.43,36.88,9.5,34.9,9.5C31.62,9.5,28.89,11.72,27.9,14.58H23.5V11.22C25.36,7.5,30.34,4.5,36.31,4.5Z" fill="#EA4335"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M12.9844 2.87114C11.1035 2.87114 9.5625 4.41211 9.5625 6.293V11.3907H2.87114C2.87114 13.2716 4.41211 14.8126 6.293 14.8126H9.5625V19.7071C9.5625 21.588 11.1035 23.129 12.9844 23.129H20.129C22.0099 23.129 23.5509 21.588 23.5509 19.7071V14.8126H26.8204C28.7013 14.8126 30.2423 13.2716 30.2423 11.3907V6.293C30.2423 4.41211 28.7013 2.87114 26.8204 2.87114H12.9844ZM12.9844 6.293H26.8204V11.3907H23.5509C21.67 11.3907 20.129 12.9317 20.129 14.8126V19.7071H12.9844V6.293Z" fill="#5F259F"/>
        <path d="M13.6289 10.1602V15.8907H16.6329V10.1602H13.6289Z" fill="#5F259F"/>
    </svg>
);


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

  const qrCodeDetails = paymentDetails ? paymentDetails['Scan QR Code'] : null;

  const otherPaymentMethods = paymentDetails 
    ? Object.keys(paymentDetails).filter(method => method !== 'Scan QR Code' && (paymentDetails[method].details || paymentDetails[method].imageUrl))
    : [];

  const paymentMethodsConfig: { [key: string]: { logo: React.ReactNode, title: string } } = {
        'UPI': { logo: <UpiLogo />, title: 'UPI' },
        'Bank Transfer': { logo: <BankLogo />, title: 'Bank Transfer' },
        'Paytm/PhonePe': { logo: <PaytmPhonePeLogo />, title: 'Paytm/PhonePe' },
   };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 light">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Add Points</DialogTitle>
          <DialogDescription>
            Complete the payment using the details below and submit your request.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] overflow-y-auto">
        <div className="p-4 pt-2">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-3">
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Enter amount (Min: ₹100)" {...field} onChange={e => field.onChange(e.target.value)} value={field.value || ''} className="h-11 border-2 border-primary/50 focus:border-primary focus:ring-primary/20" />
                            </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                
                {qrCodeDetails?.imageUrl && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <p className="text-center text-sm mb-2">{qrCodeDetails.title || 'Scan to Pay'}</p>
                    <Image src={qrCodeDetails.imageUrl} alt="Payment QR Code" width={200} height={200} className="rounded-md" unoptimized/>
                  </div>
                )}


                <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                    <FormItem className="space-y-2">
                    <FormLabel>Or Select Other Payment Method</FormLabel>
                    <FormControl>
                        {loadingDetails ? (
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </div>
                        ) : (
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-2"
                            >
                            {otherPaymentMethods.map((method) => {
                                const detail = paymentDetails![method as keyof typeof paymentDetails];
                                const config = paymentMethodsConfig[method];
                                return (
                                <FormItem key={method}>
                                <FormControl>
                                    <RadioGroupItem value={method} className="peer sr-only" id={method} />
                                </FormControl>
                                <Label htmlFor={method} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-1 h-14 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        {config?.logo}
                                        <span className="mt-1 font-semibold text-xs text-center">{config?.title || detail.title}</span>
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
                        <CardContent className="p-3">
                            <p className="text-sm font-semibold">{selectedPaymentDetail.title}</p>
                            {selectedPaymentDetail.details && (
                                <p className="text-sm text-muted-foreground break-words">{selectedPaymentDetail.details}</p>
                            )}
                            { !selectedPaymentDetail.details && (
                                <p className="text-sm text-muted-foreground">Details not available.</p>
                            )}
                        </CardContent>
                    </Card>
                )}
                 <DialogFooter className="gap-2 sm:gap-0 pt-2 flex flex-col sm:flex-row">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="h-11 w-full sm:w-auto">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting || loadingDetails} className="h-11 w-full sm:w-auto">
                        {isSubmitting ? <Loader className="mr-2" /> : null}
                        Submit Request
                    </Button>
                    </DialogFooter>
            </form>
            </Form>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
