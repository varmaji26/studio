'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, runTransaction, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, Send, Trash2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useGame } from '@/hooks/use-game';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

const allJodis: Record<string, string[]> = {
    '0': ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'],
    '1': ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'],
    '2': ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
    '3': ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39'],
    '4': ['40', '41', '42', '43', '44', '45', '46', '47', '48', '49'],
    '5': ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59'],
    '6': ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69'],
    '7': ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'],
    '8': ['80', '81', '82', '83', '84', '85', '86', '87', '88', '89'],
    '9': ['90', '91', '92', '93', '94', '95', '96', '97', '98', '99'],
};

interface BidItem {
    number: string;
    amount: number;
};

export default function JodiDigitPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { game, now } = useGame();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDigit, setSelectedDigit] = useState<string | null>(null);
    const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
    const [bidsInput, setBidsInput] = useState<Record<string, string>>({});
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { openTime, isBettingDisabled } = useMemo(() => {
        if (!game || !isMounted) return { openTime: new Date(), isBettingDisabled: true };
        
        const [hours, minutes] = game.openTime.split(':').map(Number);
        const openTime = new Date(now);
        openTime.setHours(hours, minutes, 0, 0);

        return {
            openTime,
            isBettingDisabled: now.getTime() >= openTime.getTime(),
        };
    }, [game, now, isMounted]);

    const handleFilterClick = (digit: string) => {
        if (selectedDigit === digit) {
            setSelectedDigit(null); // Unselect if clicked again
        } else {
            setSelectedDigit(digit);
        }
    };
    
    const filteredJodis = useMemo(() => {
        if (selectedDigit === null) return [];
        return Object.values(allJodis).flat().filter(jodi => jodi.includes(selectedDigit));
    }, [selectedDigit]);
    
    const handleInputChange = (digit: string, value: string) => {
        setBidsInput(prev => ({...prev, [digit]: value}));
    };

    const totalAmount = useMemo(() => {
        return submittedBids.reduce((acc, bid) => acc + Number(bid.amount), 0);
    }, [submittedBids]);

    const handleAddAllBids = () => {
        const newBids = Object.entries(bidsInput)
            .filter(([_, amount]) => amount && parseInt(amount) >= 10)
            .map(([digit, amount]) => ({ number: digit, amount: Number(amount) }));

        if (newBids.length === 0) {
            toast({ title: 'No Bids to Add', description: 'Please enter points (minimum 10) for at least one jodi.', variant: 'destructive' });
            return;
        }
        
        setSubmittedBids(prev => {
            const bidsMap = new Map(prev.map(b => [b.number, b.amount]));
            newBids.forEach(bid => {
                bidsMap.set(bid.number, (bidsMap.get(bid.number) || 0) + bid.amount);
            });
            return Array.from(bidsMap, ([number, amount]) => ({ number, amount })).sort((a,b) => a.number.localeCompare(b.number));
        });
        setBidsInput({});
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
                        betType: 'Jodi Digit',
                        session: 'Open',
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

                    {isBettingDisabled && (
                        <p className="text-center text-red-500 text-sm font-bold p-2 bg-red-100/10 rounded-md">Bidding is closed for Jodi Digit in this market.</p>
                    )}
                    
                    <div className="space-y-4">
                        <div className="p-2 rounded-lg bg-slate-800">
                           <div className="grid grid-cols-5 gap-1">
                                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                                    <Button
                                        key={digit}
                                        type="button"
                                        variant={selectedDigit === digit ? 'default' : 'ghost'}
                                        onClick={() => handleFilterClick(digit)}
                                        className={cn("rounded-md text-sm h-8", selectedDigit !== digit && 'text-white hover:bg-white/10')}
                                    >
                                        {digit}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
                            <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                                {filteredJodis.map(jodi => (
                                    <div key={jodi} className="flex items-center h-8 bg-background rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary shadow-md">
                                        <label className="flex items-center justify-center h-full w-9 bg-primary text-primary-foreground border-r text-xs font-bold">
                                            {jodi}
                                        </label>
                                        <Input
                                            type="number"
                                            value={bidsInput[jodi] || ''}
                                            onChange={(e) => handleInputChange(jodi, e.target.value)}
                                            className="h-full bg-background border-none text-center text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                                            disabled={isBettingDisabled}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Button type="button" onClick={handleAddAllBids} className="w-full bg-orange-600 hover:bg-orange-700" size="sm" disabled={isBettingDisabled}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add All Bids
                        </Button>
                    </div>
                    
                    {submittedBids.length > 0 && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-xs font-medium text-center text-muted-foreground">YOUR BIDS LIST</h4>
                            <ScrollArea className="h-32 rounded-lg bg-slate-900 border border-slate-700 p-1 space-y-1">
                                {submittedBids.map((bid, index) => (
                                    <div key={index} className="flex justify-between items-center bg-slate-800 p-1 px-2 rounded-md animate-in fade-in-0">
                                        <p className="text-xs">Number: <span className="font-bold">{bid.number}</span></p>
                                        <p className="text-xs">Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBid(bid.number)}>
                                            <Trash2 className="h-3 w-3 text-destructive"/>
                                        </Button>
                                    </div>
                                ))}
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
