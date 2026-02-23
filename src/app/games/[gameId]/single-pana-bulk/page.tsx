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
import { useGame } from '@/hooks/use-game';
import { Textarea } from '@/components/ui/textarea';

const panaSchema = /^\d{3}$/;

// Function to check if a pana is a "single pana"
const isSinglePana = (pana: string) => {
    if (!panaSchema.test(pana)) return false;
    const digits = pana.split('');
    const uniqueDigits = new Set(digits);
    return uniqueDigits.size === 3;
};

export default function SinglePanaBulkPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [panas, setPanas] = useState(''); // Textarea content
  const [selectedPanas, setSelectedPanas] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close'>('Open');
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Parse panas from textarea
  useEffect(() => {
    const parsedPanas = panas.trim().split(/[\s,]+/).filter(Boolean);
    setSelectedPanas(parsedPanas);
  }, [panas]);

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
    const numSelected = selectedPanas.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      setPotentialWin(parsedAmount * 150);
    } else {
      setTotalAmount(0);
      setPotentialWin(0);
    }
  }, [amount, selectedPanas]);

  const handlePlaceBet = async () => {
    if (!user || !game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or game data missing.' });
        return;
    }
    
    const validPanas = selectedPanas.filter(p => isSinglePana(p));
    const invalidPanas = selectedPanas.filter(p => !isSinglePana(p));

    if (invalidPanas.length > 0) {
        toast({ variant: 'destructive', title: 'Invalid Panas', description: `The following numbers are not valid Single Panas: ${invalidPanas.join(', ')}` });
        return;
    }

    if (validPanas.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter at least one valid Single Pana number.' });
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
                betType: 'Single Pana',
                session,
                numbers: validPanas,
                amountPerBet: parseInt(amount),
                totalAmount: totalAmount,
                status: 'running',
                createdAt: serverTimestamp(),
            });
        });

        toast({
            title: 'Bet Placed Successfully!',
            description: `Your bet of ₹${totalAmount} on ${validPanas.length} numbers has been placed for ${game?.name}.`,
            className: 'bg-green-600 text-white border-green-700',
        });

        setPanas('');
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
                <CardTitle className="text-base">Enter Pana Numbers (Bulk):</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <Textarea 
                    placeholder="Enter numbers separated by space or new line, e.g., 123 456 789"
                    className="min-h-[120px] text-sm"
                    value={panas}
                    onChange={(e) => setPanas(e.target.value)}
                />
            </CardContent>
        </Card>

        <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="bet-amount" className="text-sm">Bet Amount (per number) (₹):</Label>
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
                    <span className="font-semibold">Single Pana (Bulk)</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Number Count:</span>
                    <span className="font-semibold">{selectedPanas.length}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Session:</span>
                    <span className="font-semibold">{session || 'Closed'}</span>
                </div>
                <div className="flex justify-between text-primary">
                    <span className="text-primary/80">Potential Win (per number):</span>
                    <span className="font-bold">₹{potentialWin.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>
        
        <div className="mt-4">
            <Button className="w-full h-10 text-base font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0 || isSubmitting || isBettingDisabled}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                {isBettingDisabled ? 'Betting Closed' : isSubmitting ? 'Placing Bet...' : `Place Bet - ₹${totalAmount}`}
            </Button>
        </div>
    </div>
  );
}
