
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
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGame } from '../layout';

const jodiSchema = /^\d{2}$/;

export default function JodiDigitPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();

  const [currentJodi, setCurrentJodi] = useState('');
  const [selectedJodi, setSelectedJodi] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close' | null>('Open');
  
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
  
  const openDateTime = new Date(now);
  openDateTime.setHours(openTime.hours, openTime.minutes, 0, 0);

  const isTimeOver = isMounted && now >= openDateTime;
  
  useEffect(() => {
    if (isTimeOver) {
        setSession(null); // Jodi time is over
    } else {
        setSession('Open'); // Jodi betting is open
    }
  }, [isTimeOver]);

  useEffect(() => {
    const parsedAmount = parseInt(amount, 10);
    const numSelected = selectedJodi.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      setPotentialWin(parsedAmount * 100);
    } else {
      setTotalAmount(0);
      setPotentialWin(0);
    }
  }, [amount, selectedJodi]);


  const handleAddJodi = () => {
    if (!jodiSchema.test(currentJodi)) {
      toast({ variant: 'destructive', title: 'Invalid Jodi', description: 'Please enter a valid 2-digit number.' });
      return;
    }
    if (selectedJodi.includes(currentJodi)) {
      toast({ variant: 'destructive', title: 'Duplicate Jodi', description: 'This number has already been added.' });
      return;
    }
    setSelectedJodi((prev) => [...prev, currentJodi]);
    setCurrentJodi('');
  };
  
  const handleRemoveJodi = (jodiToRemove: string) => {
    setSelectedJodi((prev) => prev.filter((j) => j !== jodiToRemove));
  };

  const handlePlaceBet = async () => {
    if (!user || !game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication or game data missing.' });
        return;
    }
    if (selectedJodi.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one Jodi number.' });
      return;
    }
    if (!amount || parseInt(amount) < 5) {
      toast({ variant: 'destructive', title: 'Error', description: 'Minimum bet amount for Jodi is ₹5.' });
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
                betType: 'Jodi Digit',
                session: 'Open', // Jodi is always considered for the full game based on open time
                numbers: selectedJodi,
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

        setSelectedJodi([]);
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
  
  const isBettingDisabled = isTimeOver;

  return (
    <div className="space-y-4">
        {isTimeOver && (
             <Alert variant="destructive" className="bg-red-600 border-red-700 text-white">
                <AlertTitle className="font-bold">JODI TIME OVER</AlertTitle>
                <AlertDescription className="text-white/90">
                   Jodi betting for this game is now closed.
                </AlertDescription>
            </Alert>
        )}
        
        <Card className="bg-background/80 border-white/10">
            <CardHeader className="p-4">
                <CardTitle className="text-base">Enter Jodi Number(s):</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-2">
                    <Input 
                        type="tel"
                        maxLength={2}
                        placeholder="Enter 2 digits (e.g., 23)"
                        className="h-9 text-sm"
                        value={currentJodi}
                        onChange={(e) => {
                            if (/^\d{0,2}$/.test(e.target.value)) {
                                setCurrentJodi(e.target.value)
                            }
                        }}
                        disabled={isBettingDisabled}
                    />
                     <Button onClick={handleAddJodi} size="sm" disabled={isBettingDisabled}>Add</Button>
                </div>
                {selectedJodi.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {selectedJodi.map((jodi) => (
                            <Badge key={jodi} className="text-sm py-1 px-2 bg-green-500 text-white">
                                {jodi}
                                <button onClick={() => handleRemoveJodi(jodi)} className="ml-2 rounded-full hover:bg-destructive/80 p-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
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
                    disabled={isBettingDisabled}
                />
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
                    <span className="font-semibold">Jodi Digit</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Numbers:</span>
                    <span className="font-semibold">{selectedJodi.join(', ') || '-'}</span>
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
            <p className="text-center text-muted-foreground mb-2 text-xs">Total Bids: {selectedJodi.length}</p>
             <Button className="w-full h-10 text-base font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0 || isSubmitting || isBettingDisabled}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                {isBettingDisabled ? 'JODI TIME OVER' : isSubmitting ? 'Placing Bet...' : `Place Bet - ₹${totalAmount}`}
            </Button>
        </div>
    </div>
  );
}
