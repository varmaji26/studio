
'use client';

import React, { useEffect, useState } from 'react';
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
import { useGame } from '../layout';

const numbers = Array.from({ length: 10 }, (_, i) => i.toString());

export default function SingleDigitPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close'>('Open');
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);
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

  useEffect(() => {
    const parsedAmount = parseInt(amount, 10);
    const numSelected = selectedNumbers.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      setPotentialWin(parsedAmount * 10);
    } else {
      setTotalAmount(0);
      setPotentialWin(0);
    }
  }, [amount, selectedNumbers]);


  const toggleNumber = (num: string) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handlePlaceBet = async () => {
    if (!user || !game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or game data missing.' });
        return;
    }
    if (selectedNumbers.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one number.' });
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid bet amount.' });
      return;
    }
    if (!session) {
      toast({ variant: 'destructive', title: 'Error', description: 'Betting is currently closed for this session.' });
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(db, 'users', user.uid);

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
            transaction.set(doc(bidsCollectionRef), {
                userId: user.uid,
                displayName: user.displayName,
                mobile: userData.mobile,
                gameId: game.id,
                gameName: game?.name,
                betType: 'Single Digit',
                session,
                numbers: selectedNumbers,
                amountPerBet: parseInt(amount),
                totalAmount: totalAmount,
                status: 'running',
                createdAt: serverTimestamp(),
            });
        });

        toast({
            title: 'Bet Placed Successfully!',
            description: `Your bet of ₹${totalAmount} has been placed for ${game?.name}.`,
            className: 'bg-green-600 text-white border-green-700',
        });

        setSelectedNumbers([]);
        setAmount('');
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
  
  const isBettingDisabled = (session === 'Open' && isOpenDisabled) || (session === 'Close' && isCloseDisabled) || isCloseDisabled;

  return (
    <div className="space-y-4">
        <Card className="bg-background/80 border-white/10">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Select Number(s):</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-2 p-4 pt-0">
                {numbers.map((num) => (
                    <Button 
                        key={num}
                        variant={selectedNumbers.includes(num) ? 'default' : 'outline'}
                        className="aspect-square text-base font-bold h-9 w-9"
                        onClick={() => toggleNumber(num)}
                    >
                        {num}
                    </Button>
                ))}
            </CardContent>
        </Card>

        <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="bet-amount" className="text-sm">Bet Amount (₹):</Label>
                <Input 
                    id="bet-amount"
                    type="number"
                    placeholder="Enter amount" 
                    className="h-9 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label className="text-sm">Select Session:</Label>
                 <RadioGroup 
                    value={session} 
                    onValueChange={(value) => setSession(value as 'Open' | 'Close')}
                    className="grid grid-cols-2 gap-2"
                >
                    <Label 
                        className={`flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer ${session === 'Open' ? 'bg-primary text-primary-foreground border-primary' : ''} ${isOpenDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <RadioGroupItem value="Open" id="open" className="sr-only" disabled={isOpenDisabled} />
                        Open
                    </Label>
                     <Label 
                        className={`flex items-center justify-center rounded-md border p-2 text-center text-sm font-semibold cursor-pointer ${session === 'Close' ? 'bg-primary text-primary-foreground border-primary' : ''} ${isCloseDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <RadioGroupItem value="Close" id="close" className="sr-only" disabled={isCloseDisabled} />
                        Close
                    </Label>
                </RadioGroup>
            </div>
        </div>
    
        <Card className="bg-background/80 border-white/10">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Bet Summary:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs p-4 pt-0">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Game:</span>
                    <span className="font-semibold">{game.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-semibold">Single Digit</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Numbers:</span>
                    <span className="font-semibold">{selectedNumbers.join(', ') || '-'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Session:</span>
                    <span className="font-semibold">{session || 'Closed'}</span>
                </div>
                <div className="flex justify-between text-primary">
                    <span className="text-primary/80">Potential Win:</span>
                    <span className="font-bold">₹{potentialWin.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>
        
        <div className="mt-4">
            <p className="text-center text-muted-foreground mb-2 text-xs">Total Bids: {selectedNumbers.length}</p>
            <Button className="w-full h-10 text-base font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0 || isSubmitting || isBettingDisabled}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                {isBettingDisabled ? 'Betting Closed' : isSubmitting ? 'Placing Bet...' : `Place Bet - ₹${totalAmount}`}
            </Button>
        </div>
    </div>
  );
}
