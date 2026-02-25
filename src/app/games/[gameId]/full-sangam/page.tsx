'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, runTransaction, doc, serverTimestamp, increment, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGame } from '@/hooks/use-game';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';

const formSchema = z.object({
    openPana: z.string().length(3, "Open Pana must be 3 digits.").regex(/^\d+$/, "Must be digits."),
    closePana: z.string().length(3, "Close Pana must be 3 digits.").regex(/^\d+$/, "Must be digits."),
    points: z.coerce.number().min(10, "Minimum bid points is 10."),
});

type FormValues = z.infer<typeof formSchema>;

type BidItem = {
    number: string; // "OpenPana x ClosePana"
    amount: number;
};

export default function FullSangamPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();
  const [profile, setProfile] = useState<DocumentData>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
  
  const { isBettingDisabled } = useMemo(() => {
    if (!game) return { isBettingDisabled: true };
    
    const [hours, minutes] = game.openTime.split(':').map(Number);
    const openTime = new Date(now);
    openTime.setHours(hours, minutes, 0, 0);

    return {
        isBettingDisabled: now.getTime() >= openTime.getTime(),
    };
  }, [game, now]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      openPana: '',
      closePana: '',
      points: undefined,
    },
    mode: "onChange"
  });

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
  
  const handleAddBid = (data: FormValues) => {
    const newBid: BidItem = {
        number: `${data.openPana}x${data.closePana}`,
        amount: data.points,
    };
    
    setSubmittedBids(prev => [...prev, newBid]);
    form.reset({
      openPana: '',
      closePana: '',
      points: undefined,
    });
    toast({ title: 'Bid Added', description: `Bid for ${newBid.number} has been added to your list.` });
  };

  const removeBid = (index: number) => {
    setSubmittedBids(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    if (submittedBids.length === 0) {
      toast({ title: 'No Bids to Submit', description: 'Please add at least one valid bid.', variant: 'destructive' });
      return;
    }

    if (!user || !game) {
        toast({ title: 'Error', description: 'User or Game not found.', variant: 'destructive' });
        return;
    }

    const totalBalance = (profile.balance || 0) + (profile.bonusBalance || 0);
    if (totalAmount > totalBalance) {
        toast({
            title: 'Insufficient Balance',
            description: `You need ${totalAmount} points, but your total balance is ${totalBalance.toFixed(2)}.`,
            variant: 'destructive',
        });
        return;
    }
    
    setIsSubmitting(true);
    
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
            
            const groupedByAmount = submittedBids.reduce((acc, bid) => {
                const amountKey = bid.amount.toString();
                if (!acc[amountKey]) {
                    acc[amountKey] = [];
                }
                acc[amountKey].push(bid.number);
                return acc;
            }, {} as Record<string, string[]>);
            
            for (const amountStr in groupedByAmount) {
                const numbersForAmount = groupedByAmount[amountStr];
                const amountPerBet = parseInt(amountStr, 10);
                const totalAmountForGroup = amountPerBet * numbersForAmount.length;

                const bidData = {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: userData.mobile,
                    gameId: game.id,
                    gameName: game.name,
                    betType: 'Full Sangam',
                    session: 'Open',
                    numbers: numbersForAmount,
                    totalAmount: totalAmountForGroup,
                    amountPerBet: amountPerBet,
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
    return <div className="flex h-full w-full items-center justify-center"><Loader className="h-10 w-10 text-primary" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
          <CardContent className="p-4 space-y-4 pb-40">
                <p className="text-center text-sm font-medium">{game.name}</p>
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4" />
                    <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                </div>
                 {isBettingDisabled && (
                    <p className="text-center text-red-500 text-sm font-bold p-2 bg-red-100/10 rounded-md">Bidding is closed for Full Sangam in this market.</p>
                )}
                
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="openPana"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input placeholder="Enter Open Pana" {...field} value={field.value ?? ''} maxLength={3} className="text-center text-sm h-11" disabled={isBettingDisabled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="closePana"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input placeholder="Enter Close Pana" {...field} value={field.value ?? ''} maxLength={3} className="text-center text-sm h-11" disabled={isBettingDisabled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input type="number" placeholder="Enter Bid Points" {...field} value={field.value ?? ''} className="text-center text-sm h-11" disabled={isBettingDisabled} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" onClick={form.handleSubmit(handleAddBid)} className="w-full text-sm bg-orange-600 hover:bg-orange-700" size="lg" disabled={isBettingDisabled}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                
                 {submittedBids.length > 0 && (
                    <div className="space-y-2 pt-4">
                        <h4 className="text-xs font-medium text-center text-muted-foreground">Your Bids List</h4>
                        <div className="border rounded-lg p-1 space-y-1 max-h-48 overflow-y-auto bg-slate-900 border-slate-700">
                            {submittedBids.map((bid, index) => (
                                <div key={index} className="flex justify-between items-center bg-slate-800 p-1 px-2 rounded-md animate-in fade-in-0">
                                    <p className="text-xs">Combination: <span className="font-bold">{bid.number}</span></p>
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
                <div className="flex flex-col text-left">
                    <span className="text-xs text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg text-white">₹{totalAmount}</span>
                </div>
                <Button type="button" onClick={handleFinalSubmit} size="lg" className="w-2/3 text-sm bg-green-600 hover:bg-green-700" disabled={isSubmitting || isBettingDisabled || submittedBids.length === 0}>
                    {isSubmitting ? <Loader className="mr-2"/> : null}
                    {isBettingDisabled ? 'Bidding Closed' : 'Continue'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
