
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, query, onSnapshot, orderBy, DocumentData, writeBatch, doc, where, getDocs, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as z from 'zod';

const formSchema = z.object({
  newOpenPana: z.string().length(3, 'Pana must be 3 digits.'),
});

type GameResultFormValues = z.infer<typeof formSchema>;

interface Game extends DocumentData {
    id: string;
    name: string;
    openResult: string;
    closeResult: string;
    result: string;
}

const WIN_RATES = {
  'Single Digit': 10,
  'Jodi Digit': 100,
  'Single Pana': 150,
  'Double Pana': 300,
  'Triple Pana': 600,
};

const calculateJodiDigit = (pana: string): string => {
    if (!pana || pana.length !== 3 || !/^\d+$/.test(pana)) return '';
    return (pana.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
};

export default function UpdateResultsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const form = useForm<GameResultFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newOpenPana: '',
    },
  });

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("openTime", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      if (gamesData.length > 0 && !selectedGameId) {
        setSelectedGameId(gamesData[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedGameId]);

  const handleUpdateResult = async (values: GameResultFormValues) => {
    if (!selectedGameId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a game first.' });
        return;
    }
    const game = games.find(g => g.id === selectedGameId);
    if (!game) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected game not found.' });
        return;
    }

    setIsSubmitting(true);
    const newOpenPana = values.newOpenPana;
    const openJodiDigit = calculateJodiDigit(newOpenPana);
    
    try {
      const batch = writeBatch(db);
      const gameDocRef = doc(db, 'games', game.id);
      
      batch.update(gameDocRef, { 
        openResult: newOpenPana,
        closeResult: '**',
        result: `${newOpenPana}-**-**` // Update result with placeholder
      });

      const bidsQuery = query(
        collection(db, 'bids'),
        where('gameId', '==', game.id),
        where('status', '==', 'running')
      );
      const bidsSnapshot = await getDocs(bidsQuery);
      
      let winnersFound = 0;
      let totalWinningAmount = 0;

      bidsSnapshot.forEach(bidDoc => {
        const bid = bidDoc.data();
        const bidNumbers = bid.numbers as string[];
        let isWinner = false;
        let winningAmount = 0;
        const winRate = WIN_RATES[bid.betType as keyof typeof WIN_RATES] || 0;
        const amountPerNumber = bid.totalAmount / bidNumbers.length;

        // Check only Open session bets for winning
        if (bid.session === 'Open') {
          if (bid.betType.includes('Pana') && bidNumbers.includes(newOpenPana)) {
              isWinner = true;
          } else if (bid.betType === 'Single Digit' && bidNumbers.includes(openJodiDigit)) {
              isWinner = true;
          }
        }

        if (isWinner) {
          winnersFound++;
          winningAmount = amountPerNumber * winRate;
          totalWinningAmount += winningAmount;
          batch.update(bidDoc.ref, { status: 'won', winningAmount });
          const userDocRef = doc(db, 'users', bid.userId);
          batch.update(userDocRef, { balance: increment(winningAmount) });
        } else {
          // If the bet is for the Open session or Jodi and did not win, it's lost.
          if (bid.session === 'Open' || bid.betType === 'Jodi Digit') {
            batch.update(bidDoc.ref, { status: 'lost' });
          }
        }
      });
      
      await batch.commit();
      form.reset();
      toast({
        title: 'Result Published!',
        description: `Open result for ${game.name} updated. ${winnersFound} winner(s) paid out ₹${totalWinningAmount.toFixed(2)}.`,
      });
    } catch (error) {
      console.error('Error updating result: ', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update result. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGame = games.find(g => g.id === selectedGameId);
  const newOpenPana = form.watch('newOpenPana');
  const autoJodi = calculateJodiDigit(newOpenPana);

  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Update Game Results (Open)</CardTitle>
          <CardDescription>Select a game and enter the Open Pana to update the results. The Jodi will be calculated automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateResult)} className="space-y-6 max-w-md mx-auto">
                <FormItem>
                  <FormLabel>Select Game</FormLabel>
                  <Select onValueChange={setSelectedGameId} value={selectedGameId ?? ''}>
                    <FormControl>
                      <SelectTrigger className="bg-green-500 text-white hover:bg-green-600">
                        <SelectValue placeholder="Select a game to update" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                {selectedGame && (
                    <>
                    <p className="text-sm text-center text-muted-foreground">
                        Current Result: <span className="font-bold text-foreground">{selectedGame.result || `${selectedGame.openResult || '***'}-**-${selectedGame.closeResult || '**'}`}</span>
                    </p>
                     <FormField
                        control={form.control}
                        name="newOpenPana"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Open Pana</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="Enter 3-digit pana"
                                        {...field} 
                                        className="bg-muted rounded-lg text-center text-lg"
                                        maxLength={3}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-col items-center">
                        <FormLabel className="text-sm mb-2">Auto Jodi (Open)</FormLabel>
                         <Input
                            readOnly
                            value={autoJodi}
                            className="bg-muted border-none font-bold text-center text-lg w-1/2"
                        />
                    </div>
                     <Button 
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader className="h-4 w-4 mr-2" /> : null}
                      {isSubmitting ? 'Updating...' : 'Update & Process Winners'}
                    </Button>
                    </>
                )}
              </form>
            </Form>
          )}
          {games.length === 0 && !loading && (
              <p className="text-center text-muted-foreground mt-4">No games found. Please add a game first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
