
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData, collection, addDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GameBettingLayout } from '@/components/game-betting-layout';

interface Game extends DocumentData {
  id: string;
  name: string;
}

const numbers = Array.from({ length: 10 }, (_, i) => i.toString());

export default function SingleDigitPage() {
  const params = useParams();
  const router = useRouter();
  const { gameId } = params;
  const { toast } = useToast();
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close'>('Close');
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof gameId !== 'string') return;

    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);
        if (gameDoc.exists()) {
          setGame({ id: gameDoc.id, ...gameDoc.data() } as Game);
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
  
  useEffect(() => {
    const parsedAmount = parseInt(amount, 10);
    const numSelected = selectedNumbers.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      // Assuming a rate of 10 for single digit wins
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
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a session.' });
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
            if (currentBalance < totalAmount) {
                throw new Error("Insufficient balance.");
            }

            const newBalance = currentBalance - totalAmount;
            transaction.update(userDocRef, { balance: newBalance });

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

        // Reset form
        setSelectedNumbers([]);
        setAmount('');
        setSession('Close');
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
  
  if (loading) {
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

  return (
    <GameBettingLayout gameName={game.name} gameId={game.id} activeBetType="Single Digit">
        <div className="space-y-6">
            <Card className="bg-card/80 border-white/10">
                <CardHeader>
                    <CardTitle>Select Number(s):</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-5 gap-3">
                    {numbers.map((num) => (
                        <Button 
                            key={num}
                            variant={selectedNumbers.includes(num) ? 'default' : 'outline'}
                            className="aspect-square text-2xl font-bold"
                            onClick={() => toggleNumber(num)}
                        >
                            {num}
                        </Button>
                    ))}
                </CardContent>
            </Card>

            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="bet-amount" className="text-lg">Bet Amount (₹):</Label>
                    <Input 
                        id="bet-amount"
                        type="number"
                        placeholder="Enter amount" 
                        className="h-12 text-lg"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                
                <div className="space-y-2">
                     <Label className="text-lg">Select Session:</Label>
                     <RadioGroup 
                        value={session ?? undefined} 
                        onValueChange={(value) => setSession(value as 'Open' | 'Close')} 
                        className="grid grid-cols-2 gap-4"
                     >
                        <div>
                            <RadioGroupItem value="Open" id="open" className="sr-only peer" />
                            <Label htmlFor="open" className="flex items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 text-lg hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary">
                                Open
                            </Label>
                        </div>
                         <div>
                            <RadioGroupItem value="Close" id="close" className="sr-only peer" />
                            <Label htmlFor="close" className="flex items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 text-lg hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary">
                                Close
                            </Label>
                        </div>
                     </RadioGroup>
                </div>
            </div>
        
            <Card className="bg-card/80 border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl">Bet Summary:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-lg">
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
                        <span className="font-semibold">{session || '-'}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                        <span className="text-primary/80">Potential Win:</span>
                        <span className="font-bold">₹{potentialWin.toFixed(2)}</span>
                    </div>
                </CardContent>
            </Card>
            
            <div className="mt-6">
                <p className="text-center text-muted-foreground mb-2">Total Bids: {selectedNumbers.length}</p>
                <Button className="w-full h-16 text-xl font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0 || isSubmitting}>
                    {isSubmitting ? <Loader className="mr-2" /> : null}
                    {isSubmitting ? 'Placing Bet...' : `Place Bet - ₹${totalAmount}`}
                </Button>
            </div>
        </div>
    </GameBettingLayout>
  );
}
