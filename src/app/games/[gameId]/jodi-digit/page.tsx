
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
import { Badge } from '@/components/ui/badge';
import { X, Calendar, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGame } from '@/hooks/use-game';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const jodis = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));

interface Bid {
  number: string;
  amount: number;
}

export default function JodiDigitPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [inputAmounts, setInputAmounts] = useState<Record<string, string>>({});
  const [bidList, setBidList] = useState<Bid[]>([]);
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
  
  const openDateTime = new Date(now);
  openDateTime.setHours(openTime.hours, openTime.minutes, 0, 0);

  const isTimeOver = isMounted && now >= openDateTime;

  const handleInputChange = (number: string, amount: string) => {
    const newAmounts = { ...inputAmounts };
    if (amount === '' || parseInt(amount, 10) < 0) {
        delete newAmounts[number];
    } else {
        newAmounts[number] = amount;
    }
    setInputAmounts(newAmounts);
  };

  const handleAddAllBids = () => {
    const newBids: Bid[] = Object.entries(inputAmounts)
      .map(([number, amountStr]) => ({
        number,
        amount: parseInt(amountStr, 10),
      }))
      .filter(bid => bid.amount > 0);

    if (newBids.length === 0) {
      toast({ variant: 'destructive', title: 'No Bids', description: 'Please enter an amount for at least one jodi.' });
      return;
    }

    const updatedBidsMap: Map<string, Bid> = new Map(bidList.map(b => [b.number, b]));
    newBids.forEach(newBid => {
        const existingBid = updatedBidsMap.get(newBid.number);
        if (existingBid) {
            existingBid.amount += newBid.amount;
        } else {
            updatedBidsMap.set(newBid.number, newBid);
        }
    });

    setBidList(Array.from(updatedBidsMap.values()).sort((a, b) => parseInt(a.number) - parseInt(b.number)));
    setInputAmounts({});
  };

  const handleRemoveBid = (numberToRemove: string) => {
    setBidList(currentList => currentList.filter(bid => bid.number !== numberToRemove));
  };
  
  const totalAmount = useMemo(() => {
    return bidList.reduce((sum, bid) => sum + bid.amount, 0);
  }, [bidList]);

  const handlePlaceBet = async () => {
    if (!user || !game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or game data missing.' });
        return;
    }
    if (bidList.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Your bid list is empty.' });
      return;
    }
    
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
            
            const groupedByAmount = bidList.reduce((acc, bid) => {
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
                  gameName: game?.name,
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
            title: 'Bet Placed Successfully!',
            description: `Your bets totaling ₹${totalAmount} have been placed.`,
            className: 'bg-green-600 text-white border-green-700',
        });
        setBidList([]);
    } catch (error: any) {
        console.error('Error placing bet:', error);
        toast({
            variant: 'destructive',
            title: 'Bet Failed',
            description: error.message || 'Could not place your bet.',
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
  
  const isBettingDisabled = isTimeOver;

  return (
    <div className="space-y-4 mt-4">
        {isTimeOver && (
             <Alert variant="destructive" className="bg-red-600 border-red-700 text-white">
                <AlertTitle className="font-bold">JODI TIME OVER</AlertTitle>
                <AlertDescription className="text-white/90">
                   Jodi betting for this game is now closed.
                </AlertDescription>
            </Alert>
        )}
        
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Enter Amount</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {jodis.map(jodi => (
                        <div key={jodi} className="flex items-center gap-2">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-primary rounded-md font-bold text-primary-foreground">
                                {jodi}
                            </div>
                            <Input
                                type="number"
                                placeholder=""
                                className="bg-slate-700 border-slate-600 h-8 text-center text-white"
                                value={inputAmounts[jodi] || ''}
                                onChange={(e) => handleInputChange(jodi, e.target.value)}
                                disabled={isBettingDisabled}
                            />
                        </div>
                    ))}
                </div>
                <Button onClick={handleAddAllBids} variant="outline" className="w-full mt-4 bg-slate-800 border-slate-700 hover:bg-slate-700">
                    Add All Bids
                </Button>
            </CardContent>
        </Card>

        {bidList.length > 0 && (
            <div className="mt-6">
                <h3 className="font-semibold mb-2">Your Bids List</h3>
                <ScrollArea className="h-40 rounded-lg bg-slate-900 p-2">
                    <div className="space-y-1">
                        {bidList.map((bid, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-800 px-2 py-1 rounded-md text-xs">
                                <p>Number: <span className="font-bold">{bid.number}</span></p>
                                <p>Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                <Button size="icon" variant="ghost" className="h-4 w-4 text-red-400" onClick={() => handleRemoveBid(bid.number)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border p-3 flex items-center justify-between z-10 max-w-2xl mx-auto">
            <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-xl text-white">₹{totalAmount}</p>
            </div>
            <Button className="h-12 px-8 font-bold text-base bg-green-600 hover:bg-green-700" onClick={handlePlaceBet} disabled={isSubmitting || totalAmount === 0 || isBettingDisabled}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                {isBettingDisabled ? 'JODI TIME OVER' : 'Continue'}
            </Button>
        </div>
    </div>
  );
}
