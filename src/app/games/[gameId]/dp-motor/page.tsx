'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, runTransaction, doc, serverTimestamp, increment, DocumentData, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGame } from '@/hooks/use-game';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';

const formSchema = z.object({
    session: z.enum(['Open', 'Close']),
    number: z.string()
      .min(2, "Please enter at least 2 unique digits.")
      .regex(/^[0-9]+$/, "Only digits are allowed.")
      .refine((val) => new Set(val.split('')).size === val.length, {
          message: "Digits must be unique.",
      }),
    points: z.coerce.number().min(10, "Minimum points is 10."),
});

type FormValues = z.infer<typeof formSchema>;

type BidItem = {
    number: string;
    amount: number;
};


export default function DpMotorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();
  const [profile, setProfile] = useState<DocumentData>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
  
  const { openTime, closeTime, isBettingDisabled, isOpenSessionAllowed, isCloseSessionAllowed } = useMemo(() => {
    if (!game) return { openTime: new Date(), closeTime: new Date(), isBettingDisabled: true, isOpenSessionAllowed: false, isCloseSessionAllowed: false };
    
    const [openHours, openMinutes] = game.openTime.split(':').map(Number);
    const openTime = new Date(now);
    openTime.setHours(openHours, openMinutes, 0, 0);

    const [closeHours, closeMinutes] = game.closeTime.split(':').map(Number);
    const closeTime = new Date(now);
    closeTime.setHours(closeHours, closeMinutes, 0, 0);
    
    const bettingDisabled = (session.get === 'Open' && now.getTime() >= openTime.getTime()) || (session.get === 'Close' && now.getTime() >= closeTime.getTime());
    const openAllowed = now.getTime() < openTime.getTime();
    const closeAllowed = now.getTime() >= openTime.getTime() && now.getTime() < closeTime.getTime();

    return { openTime, closeTime, isBettingDisabled: bettingDisabled, isOpenSessionAllowed: openAllowed, isCloseSessionAllowed: closeAllowed };
  }, [game, now]);

  const defaultSession = useMemo(() => {
    return now.getTime() >= openTime.getTime() ? 'Close' : 'Open';
  }, [now, openTime]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session: defaultSession,
      number: '',
      points: undefined
    },
    mode: "onChange"
  });

  const session = form.watch('session');
  
  useEffect(() => {
     form.setValue('session', defaultSession);
  }, [defaultSession, form]);
  
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setProfile(doc.data());
        }
    });
    return () => unsubscribe();
  }, [user]);

  const totalAmount = useMemo(() => {
    return submittedBids.reduce((acc, bid) => acc + Number(bid.amount), 0);
  }, [submittedBids]);

  const handleGenerate = (data: FormValues) => {
    const { number, points } = data;
    const digits = [...new Set(number.split(''))];

    if (digits.length < 2) {
      toast({ title: "Invalid Input", description: "Please enter at least 2 unique digits.", variant: "destructive" });
      return;
    }

    const dpSet = new Set<string>();

    for (let i = 0; i < digits.length; i++) {
      const doubleDigit = digits[i];
      for (let j = 0; j < digits.length; j++) {
        if (i === j) continue;
        const singleDigit = digits[j];
        
        const panaArray = [doubleDigit, doubleDigit, singleDigit].sort();
        dpSet.add(panaArray.join(''));
      }
    }
    
    const finalPanas = Array.from(dpSet);

    if (finalPanas.length === 0) {
        toast({ title: "No Panas Generated", description: "Could not generate any panas from the provided digits.", variant: "destructive" });
        return;
    }

    const newBids: BidItem[] = finalPanas.map(p => ({ number: p, amount: points }));

    setSubmittedBids(prev => [...prev, ...newBids]);
    toast({ title: "Bids Generated", description: `${newBids.length} DP Motor bids have been added to your list.` });
    form.reset({
        session: form.getValues('session'),
        number: '',
        points: undefined,
    });
  };

  const removeBid = (index: number) => {
    setSubmittedBids(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFinalSubmit = async () => {
    if (submittedBids.length === 0) {
      toast({ title: 'No Bids to Submit', description: 'Please generate some bids first.', variant: 'destructive' });
      return;
    }

    if (!user) {
        toast({ title: 'Error', description: 'User not found.', variant: 'destructive' });
        return;
    }

    if (totalAmount > ((profile.balance ?? 0) + (profile.bonusBalance ?? 0))) {
        toast({
            title: 'Insufficient Balance',
            description: `You need ${totalAmount} points, but your total balance is ${((profile.balance ?? 0) + (profile.bonusBalance ?? 0)).toFixed(2)}.`,
            variant: 'destructive',
        });
        return;
    }
    
    setIsSubmitting(true);
    const currentSession = form.getValues('session');
    
    try {
        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
              throw new Error("User not found.");
            }

            const userData = userDoc.data();
            const realBalance = userData.balance || 0;
            const bonusBalance = userData.bonusBalance || 0;

            if (totalAmount > (realBalance + bonusBalance)) {
                throw new Error("Insufficient total balance.");
            }
            
            let realAmountToDeduct = Math.min(totalAmount, realBalance);
            let bonusAmountToDeduct = totalAmount - realAmountToDeduct;

            transaction.update(userDocRef, {
                balance: increment(-realAmountToDeduct),
                bonusBalance: increment(-bonusAmountToDeduct)
            });
            
            for (const bid of submittedBids) {
                const bidData = {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: userData.mobile,
                    gameId: game?.id,
                    gameName: game?.name,
                    betType: 'Double Pana',
                    session: currentSession,
                    numbers: [bid.number],
                    totalAmount: bid.amount,
                    amountPerBet: bid.amount,
                    status: 'running',
                };
                const newBidRef = doc(collection(db, "bids"));
                transaction.set(newBidRef, { ...bidData, createdAt: serverTimestamp() });
            }
        });

        toast({
            title: 'Bids Submitted!',
            description: `Your bids have been submitted. ${totalAmount} points deducted.`,
            className: 'bg-green-600 text-white',
        });
        
        form.reset();
        setSubmittedBids([]);

    } catch (error: any) {
        console.error("Error submitting bid: ", error);
        toast({
            title: 'Submission Failed',
            description: error.message || 'There was an error submitting your bids. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

    if (!game) {
      return <Loader />
    }
  
  const isBettingFinalDisabled = (session === 'Open' && now.getTime() >= openTime.getTime()) || (session === 'Close' && now.getTime() >= closeTime.getTime());

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Card className="bg-background/80 border-white/10">
          <CardContent className="p-4 space-y-4 pb-40">
            <p className="text-center text-sm font-medium">{game.name}</p>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 flex items-center gap-3">
              <CalendarIcon className="h-4 w-4" />
              <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
            </div>
            
            <div>
              <FormLabel className="text-xs font-medium">Choose Session</FormLabel>
              <Controller
                control={form.control}
                name="session"
                render={({ field }) => (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button type="button" variant={field.value === 'Open' ? 'default' : 'outline'} onClick={() => field.onChange('Open')} disabled={!isOpenSessionAllowed} className={cn("w-full h-9 text-sm", field.value === 'Open' ? "bg-primary text-white shadow-lg" : 'text-foreground hover:bg-accent')}>Open</Button>
                    <Button type="button" variant={field.value === 'Close' ? 'default' : 'outline'} onClick={() => field.onChange('Close')} disabled={!isCloseSessionAllowed} className={cn("w-full h-9 text-sm", field.value === 'Close' ? "bg-primary text-white shadow-lg" : 'text-foreground hover:bg-accent')}>Close</Button>
                  </div>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Enter Digits (e.g., 1234)" {...field} className="text-center h-11 text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="number" placeholder="Enter Point" {...field} value={field.value ?? ''} className="text-center h-11 text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="button" onClick={form.handleSubmit(handleGenerate)} className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700">
              Generate
            </Button>
            
            {submittedBids.length > 0 && (
                <div className="space-y-2 pt-4">
                    <h4 className="text-xs font-medium text-center text-muted-foreground">Generated Bids</h4>
                    <div className="border rounded-lg p-1 space-y-1 max-h-48 overflow-y-auto bg-slate-900 border-slate-700">
                        {submittedBids.map((bid, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-800 p-1 px-2 rounded-md animate-in fade-in-0">
                                <p className="text-xs">Pana: <span className="font-bold">{bid.number}</span></p>
                                <p className="text-xs">Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBid(index)}>
                                    <Trash2 className="h-3 w-3 text-destructive"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/80 backdrop-blur-sm border-t border-border p-4 flex items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-xs text-muted-foreground">Bids</span>
                  <span className="font-bold text-lg">{submittedBids.length}</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-muted-foreground">Points</span>
                  <span className="font-bold text-lg">{totalAmount}</span>
                </div>
            </div>
            <Button type="button" onClick={handleFinalSubmit} size="lg" className="w-2/3 text-sm bg-green-600 hover:bg-green-700" disabled={isSubmitting || submittedBids.length === 0 || isBettingFinalDisabled}>
              {isSubmitting ? <Loader className="mr-2" /> : null}
              {isBettingFinalDisabled ? 'Bidding Closed' : 'Submit Bids'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
