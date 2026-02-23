'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, runTransaction, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGame } from '@/hooks/use-game';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';

const numbers = Array.from({ length: 10 }, (_, i) => i.toString());

export default function SingleDigitPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [bids, setBids] = useState<Record<string, string>>({});
  const [session, setSession] = useState<'Open' | 'Close'>('Open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const getTimeParts = (timeStr: string) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  const openTime = game ? getTimeParts(game.openTime) : { hours: 0, minutes: 0 };
  const closeTime = game ? getTimeParts(game.closeTime) : { hours: 0, minutes: 0 };

  const openDateTime = new Date(now);
  openDateTime.setHours(openTime.hours, openTime.minutes, 0, 0);

  const closeDateTime = new Date(now);
  closeDateTime.setHours(closeTime.hours, closeTime.minutes, 0, 0);

  const isOpenDisabled = now >= openDateTime;
  const isCloseDisabled = now >= closeDateTime;

   useEffect(() => {
    if (isOpenDisabled && !isCloseDisabled) {
      setSession('Close');
    } else {
      setSession('Open');
    }
  }, [isOpenDisabled, isCloseDisabled]);
  
  const handleBidChange = (number: string, amount: string) => {
    const newBids = { ...bids };
    if (amount === '' || parseInt(amount, 10) === 0) {
        delete newBids[number];
    } else {
        newBids[number] = amount;
    }
    setBids(newBids);
  };

  const totalAmount = useMemo(() => {
    return Object.values(bids).reduce((sum, amount) => sum + (parseInt(amount, 10) || 0), 0);
  }, [bids]);


  const handleAddAllBids = () => {
     toast({ title: "Action Needed", description: "Functionality for 'Add All Bids' needs to be clarified." });
  };

  const handlePlaceBet = async () => {
    if (!user || !game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or game data missing.' });
        return;
    }
    if (Object.keys(bids).length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please place at least one bet.' });
      return;
    }
    if (!session) {
      toast({ variant: 'destructive', title: 'Error', description: 'Betting is currently closed for this session.' });
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(db, 'users', user.uid);

    const betsByAmount: Record<string, string[]> = {};
    for(const number in bids) {
        const amount = bids[number];
        if(!betsByAmount[amount]) {
            betsByAmount[amount] = [];
        }
        betsByAmount[amount].push(number);
    }

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document does not exist!");
            }
            
            const userData = userDoc.data();
            const currentBalance = userData.balance || 0;
            const currentBonusBalance = userData.bonusBalance || 0;
            const totalUserBalance = currentBalance + currentBonusBalance;

            if (totalUserBalance < totalAmount) {
                throw new Error("Insufficient total balance.");
            }
            
            let amountFromReal = 0;
            let amountFromBonus = 0;

            if (currentBalance >= totalAmount) {
                amountFromReal = totalAmount;
            } else {
                amountFromReal = currentBalance;
                amountFromBonus = totalAmount - currentBalance;
            }

            transaction.update(userDocRef, { 
                balance: increment(-amountFromReal),
                bonusBalance: increment(-amountFromBonus),
            });
            
            const bidsCollectionRef = collection(db, 'bids');

            for (const amount in betsByAmount) {
                const numbersForAmount = betsByAmount[amount];
                const amountPerBet = parseInt(amount, 10);
                const totalAmountForThisGroup = amountPerBet * numbersForAmount.length;

                transaction.set(doc(bidsCollectionRef), {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: userData.mobile,
                    gameId: game.id,
                    gameName: game?.name,
                    betType: 'Single Digit',
                    session,
                    numbers: numbersForAmount,
                    amountPerBet: amountPerBet,
                    totalAmount: totalAmountForThisGroup,
                    status: 'running',
                    createdAt: serverTimestamp(),
                });
            }
        });

        toast({
            title: 'Bet Placed Successfully!',
            description: `Your bets totaling ₹${totalAmount} have been placed for ${game?.name}.`,
            className: 'bg-green-600 text-white border-green-700',
        });

        setBids({});
    } catch (error: any) {
        console.error('Error placing bet:', error);
        toast({
            variant: 'destructive',
            title: 'Bet Failed',
            description: error.message || 'Could not place your bet. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!isMounted || !game) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const isBettingDisabled = (session === 'Open' && isOpenDisabled) || (session === 'Close' && isCloseDisabled) || isCloseDisabled;
  
  return (
    <div className="space-y-4">
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-white">
            <CardContent className="p-4 space-y-4">
                <div className="text-center">
                    <h2 className="font-bold text-lg">{game.name}</h2>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(now, "EEEE, d MMMM yyyy")}</span>
                    </div>
                </div>
                
                <Tabs defaultValue="classic">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="classic">Classic</TabsTrigger>
                        <TabsTrigger value="advanced" disabled>Advanced</TabsTrigger>
                    </TabsList>
                    <TabsContent value="classic" className="mt-4">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold">Choose Session</Label>
                                <RadioGroup 
                                    value={session} 
                                    onValueChange={(value) => setSession(value as 'Open' | 'Close')}
                                    className="grid grid-cols-2 gap-2 mt-2"
                                    disabled={isBettingDisabled}
                                >
                                    <Label className={`flex items-center justify-center rounded-md border p-3 text-center text-sm font-semibold cursor-pointer ${session === 'Open' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20'} ${isOpenDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                                        <RadioGroupItem value="Open" id="open" className="sr-only" disabled={isOpenDisabled} />
                                        Open
                                    </Label>
                                    <Label className={`flex items-center justify-center rounded-md border p-3 text-center text-sm font-semibold cursor-pointer ${session === 'Close' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background/20'} ${isCloseDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                                        <RadioGroupItem value="Close" id="close" className="sr-only" disabled={isCloseDisabled} />
                                        Close
                                    </Label>
                                </RadioGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                {numbers.map(num => (
                                    <div key={num} className="flex items-center gap-2">
                                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-primary rounded-md font-bold text-primary-foreground">
                                            {num}
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="Amount"
                                            className="bg-slate-700 border-slate-600 h-8 text-center text-white"
                                            value={bids[num] || ''}
                                            onChange={(e) => handleBidChange(num, e.target.value)}
                                            disabled={isBettingDisabled}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button onClick={handleAddAllBids} variant="outline" className="w-full bg-primary/20 border-primary text-primary hover:bg-primary/30 hover:text-primary">
                                Add All Bids
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border p-3 flex items-center justify-between z-10 max-w-2xl mx-auto">
            <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-xl text-white">₹{totalAmount}</p>
            </div>
            <Button className="h-12 px-8 font-bold text-base" onClick={handlePlaceBet} disabled={isSubmitting || totalAmount === 0 || isBettingDisabled}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                {isBettingDisabled ? 'Betting Closed' : 'Continue'}
            </Button>
        </div>
    </div>
  );
}
