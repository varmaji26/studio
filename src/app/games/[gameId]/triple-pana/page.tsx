'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, runTransaction, collection, addDoc, serverTimestamp, increment, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useGame } from '@/hooks/use-game';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const allTriplePanas = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];

interface BidItem {
    number: string;
    amount: number;
};

const formSchema = z.object({
  bids: z.array(z.object({
      pana: z.string(),
      points: z.coerce.number().optional(),
  })),
});

type FormValues = z.infer<typeof formSchema>;

export default function TriplePanaPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { game, now } = useGame();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
    const [session, setSession] = useState<'Open' | 'Close'>('Open');
    const [isMounted, setIsMounted] = useState(false);
    const [settings, setSettings] = useState<DocumentData | null>(null);

    useEffect(() => {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
          if (doc.exists()) {
            setSettings(doc.data());
          }
        });
        return () => unsubscribe();
    }, []);

    const minBet = settings?.betAmountSettings?.triplePana?.min || 10;
    const maxBet = settings?.betAmountSettings?.triplePana?.max || 10000;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { openTime, closeTime, isBettingDisabled } = useMemo(() => {
        if (!game || !isMounted) return { openTime: new Date(), closeTime: new Date(), isBettingDisabled: true };
        
        const [openHours, openMinutes] = game.openTime.split(':').map(Number);
        const openTime = new Date(now);
        openTime.setHours(openHours, openMinutes, 0, 0);

        const [closeHours, closeMinutes] = game.closeTime.split(':').map(Number);
        const closeTime = new Date(now);
        closeTime.setHours(closeHours, closeMinutes, 0, 0);

        const isBettingDisabled = (session === 'Open' && now.getTime() >= openTime.getTime()) || 
                                (session === 'Close' && now.getTime() >= closeTime.getTime());

        return {
            openTime,
            closeTime,
            isBettingDisabled,
        };
    }, [game, now, isMounted, session]);
    
     useEffect(() => {
        const isOpenDisabled = now.getTime() >= openTime.getTime();
        const isCloseDisabled = now.getTime() >= closeTime.getTime();

        if (isOpenDisabled && !isCloseDisabled) {
            setSession('Close');
        } else if (!isOpenDisabled) {
            setSession('Open');
        }
    }, [now, openTime, closeTime]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            bids: allTriplePanas.map(pana => ({ pana, points: undefined })),
        },
        mode: "onChange"
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: "bids"
    });
    
    const totalAmount = useMemo(() => {
        return submittedBids.reduce((acc, bid) => acc + Number(bid.amount), 0);
    }, [submittedBids]);

    const handleAddAllBids = () => {
        const bidsData = form.getValues('bids');
        const newBids = bidsData
            .filter(bid => {
                if (!bid.points) return false;
                if (bid.points < minBet) {
                    toast({ variant: 'destructive', title: `Invalid amount for ${bid.pana}`, description: `Minimum bet is ₹${minBet}.` });
                    return false;
                }
                if (bid.points > maxBet) {
                    toast({ variant: 'destructive', title: `Invalid amount for ${bid.pana}`, description: `Maximum bet is ₹${maxBet}.` });
                    return false;
                }
                return true;
            })
            .map(bid => ({ number: bid.pana, amount: Number(bid.points!) }));


        if (newBids.length === 0) {
            toast({ title: 'No Bids to Add', description: 'Please enter points (minimum 10) for at least one pana.', variant: 'destructive' });
            return;
        }
        
        setSubmittedBids(prev => {
            const bidsMap = new Map(prev.map(b => [b.number, b.amount]));
            newBids.forEach(bid => {
                bidsMap.set(bid.number, (bidsMap.get(bid.number) || 0) + bid.amount);
            });
            return Array.from(bidsMap, ([number, amount]) => ({ number, amount })).sort((a,b) => a.number.localeCompare(b.number));
        });
        
        form.reset({
            bids: allTriplePanas.map(pana => ({ pana, points: undefined })),
        });

        toast({ title: 'Bids Added', description: `${newBids.length} bid(s) have been added/updated in your list.` });
    };

    const removeBid = (number: string) => {
        setSubmittedBids(prev => prev.filter((bid) => bid.number !== number));
    };

    const handleFinalSubmit = async () => {
        if (submittedBids.length === 0) {
          toast({ title: 'No Bids to Submit', description: 'Please add at least one valid bid.', variant: 'destructive' });
          return;
        }
        if (!user || !game) return;

        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.uid);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User document does not exist!");
                
                const userData = userDoc.data();
                const currentBalance = userData.balance || 0;
                const currentBonusBalance = userData.bonusBalance || 0;
                const totalUserBalance = currentBalance + currentBonusBalance;
    
                if (totalUserBalance < totalAmount) throw new Error("Insufficient total balance.");
                
                let amountFromReal = Math.min(totalAmount, currentBalance);
                let amountFromBonus = totalAmount - amountFromReal;
    
                transaction.update(userDocRef, { 
                    balance: increment(-amountFromReal),
                    bonusBalance: increment(-amountFromBonus),
                });
                
                const bidsCollectionRef = collection(db, 'bids');
                
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

                    transaction.set(doc(bidsCollectionRef), {
                        userId: user.uid,
                        displayName: user.displayName,
                        mobile: userData.mobile,
                        gameId: game.id,
                        gameName: game.name,
                        betType: 'Triple Pana',
                        session: session,
                        numbers: numbersForAmount,
                        amountPerBet: amountPerBet,
                        totalAmount: totalAmountForGroup,
                        status: 'running',
                        createdAt: serverTimestamp(),
                    });
                }
            });
    
            toast({
                title: 'Bids Submitted!',
                description: `Your bids totalling ₹${totalAmount} have been submitted.`,
                className: 'bg-green-600 text-white border-green-700',
            });
    
            setSubmittedBids([]);
        } catch (error: any) {
            console.error("Error submitting bid: ", error);
            toast({
                title: 'Submission Failed',
                description: error.message || 'There was an error submitting your bids.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isMounted || !game) {
        return <div className="flex h-full w-full items-center justify-center"><Loader className="h-10 w-10 text-primary" /></div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <Card className="bg-background/80 border-white/10">
                <CardContent className="p-4 space-y-4 pb-40">
                    <p className="text-center text-sm font-medium">{game.name}</p>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 flex items-center gap-3">
                        <CalendarIcon className="h-4 w-4" />
                        <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-sm">Choose Session:</Label>
                        <RadioGroup 
                            value={session} 
                            onValueChange={(value) => setSession(value as 'Open' | 'Close')}
                            className="grid grid-cols-2 gap-2"
                        >
                            <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-xs font-semibold cursor-pointer", session === 'Open' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20', (now.getTime() >= openTime.getTime()) && 'opacity-50 cursor-not-allowed')}>
                                <RadioGroupItem value="Open" id="open" className="sr-only" disabled={now.getTime() >= openTime.getTime()} />
                                Open
                            </Label>
                            <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-xs font-semibold cursor-pointer", session === 'Close' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20', now.getTime() >= closeTime.getTime() && 'opacity-50 cursor-not-allowed')}>
                                <RadioGroupItem value="Close" id="close" className="sr-only" disabled={now.getTime() >= closeTime.getTime()} />
                                Close
                            </Label>
                        </RadioGroup>
                    </div>
                    {isBettingDisabled && (
                        <p className="text-center text-red-500 text-sm font-bold p-2 bg-red-100/10 rounded-md">Bidding is closed for this session.</p>
                    )}
                    <p className="text-center text-xs text-muted-foreground">Min Bet: ₹{minBet} | Max Bet: ₹{maxBet}</p>
                    
                    <div className="space-y-4">
                        <Form {...form}>
                            <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
                                <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                                    {fields.map((field, index) => (
                                        <FormField
                                            key={field.id}
                                            control={form.control}
                                            name={`bids.${index}.points`}
                                            render={({ field: inputField }) => (
                                                <FormItem>
                                                    <div className="flex items-center h-8 bg-background rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary shadow-md border border-primary">
                                                        <Label className="flex items-center justify-center h-full w-12 bg-primary text-primary-foreground border-r text-xs font-bold">
                                                            {field.pana}
                                                        </Label>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                {...inputField}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '' || parseInt(value) >= 0) {
                                                                        inputField.onChange(e);
                                                                    }
                                                                }}
                                                                value={inputField.value ?? ''}
                                                                className="h-full bg-background border-none text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                disabled={isBettingDisabled}
                                                            />
                                                        </FormControl>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        </Form>
                        <Button type="button" onClick={handleAddAllBids} className="w-full bg-orange-600 hover:bg-orange-700" size="sm" disabled={isBettingDisabled}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add All Bids
                        </Button>
                    </div>
                    
                    {submittedBids.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-xs font-medium text-center text-muted-foreground">YOUR BIDS LIST</h4>
                             <ScrollArea className="h-32 rounded-lg bg-slate-900 border border-slate-700 p-1">
                                <div className="space-y-2 p-1">
                                    {submittedBids.map((bid, index) => (
                                        <div key={index} className="flex justify-between items-center bg-slate-800 p-1.5 px-3 rounded-md animate-in fade-in-0">
                                            <p className="text-xs">Number: <span className="font-bold">{bid.number}</span></p>
                                            <p className="text-xs">Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBid(bid.number)}>
                                                <Trash2 className="h-3 w-3 text-destructive"/>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/80 backdrop-blur-sm border-t border-border p-3 flex items-center justify-between gap-4 z-10">
                    <div className="flex flex-col text-left">
                        <span className="text-xs text-muted-foreground">Total Amount</span>
                        <span className="font-bold text-lg text-white">₹{totalAmount}</span>
                    </div>
                    <Button onClick={handleFinalSubmit} size="lg" className="w-2/3 text-sm bg-green-600 hover:bg-green-700" disabled={isSubmitting || isBettingDisabled || submittedBids.length === 0}>
                         {isSubmitting ? <Loader className="mr-2" /> : null}
                         {isBettingDisabled ? 'Bidding Closed' : 'Continue'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

    