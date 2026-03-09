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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const allPanas: Record<string, string[]> = {
    '1': ["128", "137", "146", "236", "245", "290", "380", "470", "489", "560", "579", "678"],
    '2': ["129", "138", "147", "156", "237", "246", "345", "390", "480", "570", "589", "679"],
    '3': ["120", "139", "148", "157", "238", "247", "256", "346", "590", "580", "670", "689"],
    '4': ["130", "149", "158", "167", "239", "248", "257", "347", "356", "590", "680", "789"],
    '5': ["140", "159", "168", "230", "249", "258", "267", "348", "357", "456", "690", "780"],
    '6': ["123", "150", "169", "178", "240", "259", "268", "349", "358", "367", "450", "790"],
    '7': ["124", "160", "179", "250", "269", "278", "340", "359", "368", "458", "467", "890"],
    '8': ["125", "134", "170", "189", "260", "279", "350", "369", "378", "459", "468", "567"],
    '9': ["126", "135", "180", "234", "270", "289", "360", "379", "450", "469", "478", "568"],
    '0': ["127", "136", "145", "190", "235", "280", "370", "389", "460", "479", "569", "578"],
};

interface BidItem {
    number: string;
    amount: number;
};

export default function SinglePanaBulkPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { game, now } = useGame();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDigit, setSelectedDigit] = useState<string>('1');
    const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
    const [locallySelectedPanas, setLocallySelectedPanas] = useState<string[]>([]);
    const [amount, setAmount] = useState<string>('');
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

    const minBet = settings?.betAmountSettings?.singlePana?.min || 10;

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

    const panasForSelectedDigit = useMemo(() => allPanas[selectedDigit] || [], [selectedDigit]);
    
    const totalAmount = useMemo(() => {
        return submittedBids.reduce((acc, bid) => acc + Number(bid.amount), 0);
    }, [submittedBids]);

    const handlePanaSelect = (pana: string) => {
        setLocallySelectedPanas(prev => 
            prev.includes(pana) 
                ? prev.filter(p => p !== pana) 
                : [...prev, pana]
        );
    };

    const handleAddBids = () => {
        const parsedAmount = parseInt(amount, 10);
        if (!amount || isNaN(parsedAmount) || parsedAmount < minBet) {
            toast({ title: 'Invalid Amount', description: `Please enter a valid amount (minimum ${minBet}).`, variant: 'destructive' });
            return;
        }

        if (locallySelectedPanas.length === 0) {
            toast({ title: 'No Panas Selected', description: 'Please select at least one pana to add.', variant: 'destructive' });
            return;
        }

        const newBids = locallySelectedPanas.map(pana => ({ number: pana, amount: parsedAmount }));

        setSubmittedBids(prev => {
            const bidsMap = new Map(prev.map(b => [b.number, b.amount]));
            newBids.forEach(bid => {
                bidsMap.set(bid.number, (bidsMap.get(bid.number) || 0) + bid.amount);
            });
            return Array.from(bidsMap, ([number, amount]) => ({ number, amount })).sort((a,b) => a.number.localeCompare(b.number));
        });
        
        setAmount('');
        setLocallySelectedPanas([]);
        toast({ title: 'Bids Added', description: `${newBids.length} bids have been added/updated in your list.` });
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
                        betType: 'Single Pana',
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
                <CardContent className="p-4 space-y-4 pb-20">
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
                    
                    <div className="space-y-4">
                        <div className="p-2 rounded-lg bg-slate-800">
                           <div className="grid grid-cols-5 gap-1">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(digit => (
                                    <Button
                                        key={digit}
                                        type="button"
                                        variant={selectedDigit === digit ? 'default' : 'ghost'}
                                        onClick={() => setSelectedDigit(digit)}
                                        className={cn("rounded-md text-sm h-8", selectedDigit === digit ? 'bg-orange-500' : 'text-white hover:bg-white/10')}
                                    >
                                        {digit}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bet-amount" className="text-sm">Add Amount</Label>
                            <Input 
                                id="bet-amount"
                                type="number"
                                placeholder="Enter amount" 
                                className="h-10 text-sm"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={isBettingDisabled}
                            />
                        </div>
                        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
                             <CardContent className="p-4 grid grid-cols-3 gap-2">
                                {panasForSelectedDigit.map((pana) => {
                                    const isSelected = locallySelectedPanas.includes(pana);
                                    return (
                                        <Button
                                            key={pana}
                                            variant={isSelected ? "default" : "outline"}
                                            className={cn(
                                                "h-8 text-sm font-semibold",
                                                isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                                            )}
                                            onClick={() => handlePanaSelect(pana)}
                                            disabled={isBettingDisabled}
                                        >
                                            {pana}
                                        </Button>
                                    );
                                })}
                            </CardContent>
                        </Card>
                        <Button type="button" onClick={handleAddBids} className="w-full bg-orange-600 hover:bg-orange-700" size="sm" disabled={isBettingDisabled}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Selected Bids
                        </Button>
                    </div>
                    
                    {submittedBids.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-xs font-bold text-center text-muted-foreground uppercase">YOUR BIDS LIST</h4>
                             <ScrollArea className="h-28 rounded-lg bg-slate-950/50 p-1 border border-white/5">
                                <div className="space-y-1">
                                    {submittedBids.map((bid, index) => (
                                        <div key={index} className="flex justify-between items-center bg-slate-800/80 p-1 px-3 rounded-md border border-white/5 text-[10px] animate-in fade-in-0">
                                            <p>Number: <span className="font-bold">{bid.number}</span></p>
                                            <div className="flex items-center gap-3">
                                                <p>Amount: <span className="font-bold text-green-400">₹{bid.amount}</span></p>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeBid(bid.number)}>
                                                    <Trash2 className="h-3 w-3"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/80 backdrop-blur-sm border-t border-border p-3 flex items-center justify-between gap-4 z-10">
                    <div className="flex flex-col text-left">
                        <span className="text-xs text-muted-foreground uppercase font-bold">Total Amount</span>
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
