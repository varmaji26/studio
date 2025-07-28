
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [session, setSession] = useState<'Open' | 'Close' | null>(null);
  
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
    const numSelected = selectedNumbers.length;
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && numSelected > 0) {
      const total = parsedAmount * numSelected;
      setTotalAmount(total);
      // Assuming a rate of 9.5 for single digit wins
      setPotentialWin(parsedAmount * 9.5);
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

  const handlePlaceBet = () => {
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
    
    // Placeholder for actual bet placement logic
    console.log({
      gameId,
      gameName: game?.name,
      betType: 'Single Digit',
      numbers: selectedNumbers,
      amount: parseInt(amount),
      session,
      totalAmount,
    });
    
    toast({
      title: 'Bet Placed Successfully!',
      description: `Your bet of ₹${totalAmount} has been placed for ${game?.name}.`,
    });

    // Reset form
    setSelectedNumbers([]);
    setAmount('');
    setSession(null);
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
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            Place Your Bet - <span className="text-primary">{game.name}</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-1">Single Digit Betting</p>
        </div>

        <Button asChild variant="link" className="mb-4 p-0 h-auto">
            <Link href={`/games/${gameId}`} className="flex items-center gap-2 text-primary">
                <ArrowLeft className="h-4 w-4"/>
                <span>Back to Options</span>
            </Link>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="space-y-6">
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
        </div>
        
        <Card className="bg-card/80 border-white/10 mt-8">
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
            <Button className="w-full h-16 text-xl font-bold" onClick={handlePlaceBet} disabled={totalAmount <= 0}>
                Place Bet - ₹{totalAmount}
            </Button>
        </div>
      </div>
    </div>
  );
}
