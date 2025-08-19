
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData, collection, addDoc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GameBettingLayout } from '@/components/game-betting-layout';

interface Game extends DocumentData {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
}

const numbers = Array.from({ length: 10 }, (_, i) => i.toString());

export default function SingleDigitPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId;
  const { toast } = useToast();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close' | null>(null);
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setNow(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof gameId !== 'string') return;

    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);
        if (gameDoc.exists()) {
          const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game;
          setGame(gameData);
        } else {
          router.push('/404');
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId, router]);

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
    if (isCloseDisabled) {
        setSession(null); // Betting fully closed
    } else if (isOpenDisabled) {
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
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to place a bet.' });
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

            const currentBalance = userDoc.data().balance || 0;
            const currentBonusBalance = userDoc.data().bonusBalance || 0;
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
                gameId,
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
  
  if (loading || !isMounted) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <p>Game not found.</p>
      </div>
    );
  }

  const isBettingDisabled = !session;

  return (
    <GameBettingLayout gameName={game.name} gameId={game.id} activeBetType="Single Digit">
        <div className="space-y-4">
            <Card className="bg-card/80 border-white/10">
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
            </div>
        
            <Card className="bg-card/80 border-white/10">
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
    </GameBettingLayout>
  );
}
