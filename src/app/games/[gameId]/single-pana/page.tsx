
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GameBettingLayout } from '@/components/game-betting-layout';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Game extends DocumentData {
  id: string;
  name: string;
}

const panaSchema = /^\d{3}$/;

export default function SinglePanaPage() {
  const params = useParams();
  const router = useRouter();
  const { gameId } = params;
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPana, setCurrentPana] = useState('');
  const [selectedPana, setSelectedPana] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close'>('Close');
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [potentialWin, setPotentialWin] = useState(0);

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
    const numSelected = selectedPana.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      // Assuming a rate of 140 for Single Pana wins
      setPotentialWin(parsedAmount * 140);
    } else {
      setTotalAmount(0);
      setPotentialWin(0);
    }
  }, [amount, selectedPana]);


  const handleAddPana = () => {
    if (!panaSchema.test(currentPana)) {
      toast({ variant: 'destructive', title: 'Invalid Pana', description: 'Please enter a valid 3-digit number.' });
      return;
    }
    if (selectedPana.includes(currentPana)) {
      toast({ variant: 'destructive', title: 'Duplicate Pana', description: 'This number has already been added.' });
      return;
    }
    setSelectedPana((prev) => [...prev, currentPana]);
    setCurrentPana('');
  };
  
  const handleRemovePana = (panaToRemove: string) => {
    setSelectedPana((prev) => prev.filter((p) => p !== panaToRemove));
  };

  const handlePlaceBet = () => {
    if (selectedPana.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one Pana number.' });
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid bet amount.' });
      return;
    }
    
    // Placeholder for actual bet placement logic
    console.log({
      gameId,
      gameName: game?.name,
      betType: 'Single Pana',
      numbers: selectedPana,
      amount: parseInt(amount),
      session,
      totalAmount,
    });
    
    toast({
      title: 'Bet Placed Successfully!',
      description: `Your bet of ₹${totalAmount} has been placed for ${game?.name}.`,
    });

    // Reset form
    setSelectedPana([]);
    setAmount('');
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
    <GameBettingLayout gameName={game.name} gameId={game.id} activeBetType="Single Pana">
        <div className="space-y-6">
            <Card className="bg-card/80 border-white/10">
                <CardHeader>
                    <CardTitle>Enter Pana Number(s):</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="tel"
                            maxLength={3}
                            placeholder="Enter 3 digits (e.g., 123)"
                            className="h-12 text-lg"
                            value={currentPana}
                            onChange={(e) => {
                                if (/^\d{0,3}$/.test(e.target.value)) {
                                    setCurrentPana(e.target.value)
                                }
                            }}
                        />
                         <Button onClick={handleAddPana}>Add</Button>
                    </div>
                    {selectedPana.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {selectedPana.map((pana) => (
                                <Badge key={pana} variant="secondary" className="text-lg py-1 px-3">
                                    {pana}
                                    <button onClick={() => handleRemovePana(pana)} className="ml-2 rounded-full hover:bg-destructive/80 p-0.5">
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
                        <span className="font-semibold">Single Pana</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Numbers:</span>
                        <span className="font-semibold">{selectedPana.join(', ') || '-'}</span>
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
                <p className="text-center text-muted-foreground mb-2">Total Bids: {selectedPana.length}</p>
                <Button className="w-full h-16 text-xl font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0}>
                    Place Bet - ₹{totalAmount}
                </Button>
            </div>
        </div>
    </GameBettingLayout>
  );
}
