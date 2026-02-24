'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, runTransaction, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGame } from '@/hooks/use-game';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BidItem {
    number: string;
    amount: number;
    type: 'Single Pana' | 'Double Pana' | 'Triple Pana';
}

export default function SpDpTpMotorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [session, setSession] = useState<'Open' | 'Close'>('Open');
  const [panaType, setPanaType] = useState<'SP' | 'DP' | 'TP'>('SP');
  const [numberInput, setNumberInput] = useState('');
  const [pointInput, setPointInput] = useState('');
  
  const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

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

  const totalAmount = useMemo(() => {
      return submittedBids.reduce((acc, bid) => acc + bid.amount, 0);
  }, [submittedBids]);

  const getUniqueDigits = (input: string) => {
    return [...new Set(input.split(''))].filter(d => !isNaN(parseInt(d, 10))).map(d => parseInt(d, 10));
  }

  const generateSP = (digits: number[]) => {
      const results = new Set<string>();
      if (digits.length < 3) return [];
      for (let i = 0; i < digits.length; i++) {
          for (let j = i + 1; j < digits.length; j++) {
              for (let k = j + 1; k < digits.length; k++) {
                  const combo = [digits[i], digits[j], digits[k]].sort((a,b)=>a-b);
                  results.add(combo.join(''));
              }
          }
      }
      return Array.from(results);
  }
  
  const generateDP = (digits: number[]) => {
      const results = new Set<string>();
      if (digits.length < 2) return [];
      for (let i = 0; i < digits.length; i++) {
          for (let j = 0; j < digits.length; j++) {
              if (i === j) continue;
              const combo = [digits[i], digits[i], digits[j]].sort((a,b)=>a-b);
              results.add(combo.join(''));
          }
      }
      return Array.from(results);
  }
  
  const generateTP = (digits: number[]) => {
      return digits.map(d => `${d}${d}${d}`);
  }
  
  const handleGenerate = () => {
    const digits = getUniqueDigits(numberInput);
    if (digits.length === 0) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter valid digits (0-9) in the number field.' });
        return;
    }

    const points = parseInt(pointInput, 10);
    if (isNaN(points) || points < 10) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a bet amount of at least ₹10.' });
        return;
    }

    let generatedPanas: string[] = [];
    let betType: BidItem['type'] = 'Single Pana';

    if (panaType === 'SP') {
        if (digits.length < 3) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter at least 3 unique digits for Single Pana Motor.' });
            return;
        }
        generatedPanas = generateSP(digits);
        betType = 'Single Pana';
    } else if (panaType === 'DP') {
        if (digits.length < 2) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter at least 2 unique digits for Double Pana Motor.' });
            return;
        }
        generatedPanas = generateDP(digits);
        betType = 'Double Pana';
    } else if (panaType === 'TP') {
        generatedPanas = generateTP(digits);
        betType = 'Triple Pana';
    }

    if (generatedPanas.length === 0) {
        toast({ title: 'No Panas Generated', description: 'No valid panas could be generated from your input.' });
        return;
    }

    const newBids = generatedPanas.map(pana => ({
        number: pana,
        amount: points,
        type: betType,
    }));

    setSubmittedBids(prevBids => {
        const bidsMap = new Map(prevBids.map(b => [`${b.number}-${b.type}`, b]));
        newBids.forEach(bid => {
            const key = `${bid.number}-${bid.type}`;
            if (bidsMap.has(key)) {
                const existingBid = bidsMap.get(key)!;
                existingBid.amount += bid.amount;
            } else {
                bidsMap.set(key, bid);
            }
        });
        return Array.from(bidsMap.values());
    });

    toast({ title: 'Bids Generated', description: `${newBids.length} bids have been added to your list.` });
    setNumberInput('');
  }

  const removeBid = (number: string, type: string) => {
    setSubmittedBids(prev => prev.filter(bid => !(bid.number === number && bid.type === type)));
  };

  const handleFinalSubmit = async () => {
    if (submittedBids.length === 0) {
      toast({ title: 'No Bids to Submit', description: 'Please generate at least one valid bid.', variant: 'destructive' });
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

            const groupedByTypeAndAmount = submittedBids.reduce((acc, bid) => {
                const key = `${bid.type}-${bid.amount}`;
                if (!acc[key]) {
                    acc[key] = {
                        type: bid.type,
                        amountPerBet: bid.amount,
                        numbers: []
                    };
                }
                acc[key].numbers.push(bid.number);
                return acc;
            }, {} as Record<string, { type: BidItem['type'], amountPerBet: number, numbers: string[]}>);
            
            for (const key in groupedByTypeAndAmount) {
                const group = groupedByTypeAndAmount[key];
                const totalAmountForGroup = group.amountPerBet * group.numbers.length;

                transaction.set(doc(bidsCollectionRef), {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: userData.mobile,
                    gameId: game.id,
                    gameName: game.name,
                    betType: group.type,
                    session: session,
                    numbers: group.numbers,
                    amountPerBet: group.amountPerBet,
                    totalAmount: totalAmountForGroup,
                    status: 'running',
                    createdAt: serverTimestamp(),
                });
            }
        });

        toast({
            title: 'Bids Submitted!',
            description: `Your bets totalling ₹${totalAmount} have been submitted.`,
            className: 'bg-green-600 text-white border-green-700',
        });

        setSubmittedBids([]);
        setPointInput('');
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
  
  if (!isMounted) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }
  
  if (!game) {
    return null;
  }

  return (
    <div className="space-y-4">
        <Card className="bg-background/80 border-white/10">
            <CardHeader className="p-4 text-center">
                <CardTitle className="text-base">{game.name}</CardTitle>
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 flex items-center justify-center gap-3">
                    <CalendarIcon className="h-4 w-4" />
                    <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 pb-40">
                <div className="space-y-2">
                    <Label className="text-sm">Choose Session:</Label>
                    <RadioGroup 
                        value={session} 
                        onValueChange={(value) => setSession(value as 'Open' | 'Close')}
                        className="grid grid-cols-2 gap-2"
                    >
                        <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer", session === 'Open' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20', (now.getTime() >= openTime.getTime()) && 'opacity-50 cursor-not-allowed')}>
                            <RadioGroupItem value="Open" id="open" className="sr-only" disabled={now.getTime() >= openTime.getTime()} />
                            Open
                        </Label>
                        <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer", session === 'Close' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20', now.getTime() >= closeTime.getTime() && 'opacity-50 cursor-not-allowed')}>
                            <RadioGroupItem value="Close" id="close" className="sr-only" disabled={now.getTime() >= closeTime.getTime()} />
                            Close
                        </Label>
                    </RadioGroup>
                </div>

                <RadioGroup 
                    value={panaType} 
                    onValueChange={(value) => setPanaType(value as 'SP' | 'DP' | 'TP')}
                    className="grid grid-cols-3 gap-2"
                >
                    <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer", panaType === 'SP' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20')}>
                        <RadioGroupItem value="SP" id="sp" className="sr-only" />
                        SP
                    </Label>
                    <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer", panaType === 'DP' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20')}>
                        <RadioGroupItem value="DP" id="dp" className="sr-only" />
                        DP
                    </Label>
                    <Label className={cn("flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer", panaType === 'TP' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20')}>
                        <RadioGroupItem value="TP" id="tp" className="sr-only" />
                        TP
                    </Label>
                </RadioGroup>
                 <div className="space-y-2">
                    <Label htmlFor="number" className="text-sm">Number</Label>
                    <Input 
                        id="number"
                        type="number"
                        placeholder="Enter digits (e.g., 1234)" 
                        className="h-10 text-sm"
                        value={numberInput}
                        onChange={(e) => setNumberInput(e.target.value)}
                        disabled={isBettingDisabled}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="point" className="text-sm">Enter Point</Label>
                    <Input 
                        id="point"
                        type="number"
                        placeholder="Enter amount (min 10)" 
                        className="h-10 text-sm"
                        value={pointInput}
                        onChange={(e) => setPointInput(e.target.value)}
                        disabled={isBettingDisabled}
                    />
                </div>
                <Button onClick={handleGenerate} className="w-full" disabled={isBettingDisabled}>Generate</Button>
                {submittedBids.length > 0 && (
                    <div className="space-y-2 pt-4">
                        <h4 className="text-xs font-medium text-center text-muted-foreground">YOUR BIDS LIST</h4>
                         <ScrollArea className="h-32 rounded-lg bg-slate-900 border border-slate-700 p-1">
                            <div className="space-y-2 p-1">
                                {submittedBids.map((bid, index) => (
                                    <div key={`${bid.number}-${bid.type}-${index}`} className="flex justify-between items-center bg-slate-800 p-1.5 px-3 rounded-md animate-in fade-in-0">
                                        <p className="text-xs">{bid.type}: <span className="font-bold">{bid.number}</span></p>
                                        <p className="text-xs">Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBid(bid.number, bid.type)}>
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
                     {isBettingDisabled ? 'Bidding Closed' : 'Submit Bids'}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
    