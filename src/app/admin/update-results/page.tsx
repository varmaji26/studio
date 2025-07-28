
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, onSnapshot, orderBy, DocumentData, writeBatch, doc, where, getDocs, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const resultSchema = z.object({
  result: z.string().min(1, 'Result is required.'),
  session: z.enum(['Open', 'Close']),
});

const formSchema = z.object({
  games: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      result: z.string(),
      newResult: z.string().optional(),
      session: z.enum(['Open', 'Close']).optional(),
    })
  ),
});

type GameResultFormValues = z.infer<typeof formSchema>;

interface Game extends DocumentData {
    id: string;
    name: string;
    result: string;
}

const WIN_RATES = {
  'Single Digit': 9.5,
  'Jodi Digit': 95,
  'Single Pana': 140,
  'Double Pana': 290,
  'Triple Pana': 700,
};

export default function UpdateResultsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const form = useForm<GameResultFormValues>({
    defaultValues: {
      games: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "games",
  });

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      replace(gamesData.map(g => ({...g, newResult: '', session: 'Open'})));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [replace]);

  const handleUpdateResult = async (gameIndex: number) => {
    const game = form.getValues(`games.${gameIndex}`);
    const newResult = game.newResult;
    const session = game.session;

    if (!session) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a session.' });
      return;
    }

    const resultValidation = resultSchema.safeParse({ result: newResult, session });
    if (!resultValidation.success) {
      form.setError(`games.${gameIndex}.newResult`, {
        type: 'manual',
        message: resultValidation.error.errors[0].message,
      });
      return;
    }
    
    setIsSubmitting(game.id);
    
    try {
      const batch = writeBatch(db);
      const gameDocRef = doc(db, 'games', game.id);
      
      // 1. Update the game result itself
      batch.update(gameDocRef, { result: newResult });

      // 2. Find all relevant bids
      const bidsQuery = query(
        collection(db, 'bids'),
        where('gameId', '==', game.id),
        where('session', '==', session),
        where('status', '==', 'running')
      );
      const bidsSnapshot = await getDocs(bidsQuery);
      
      let winnersFound = 0;

      bidsSnapshot.forEach(bidDoc => {
        const bid = bidDoc.data();
        const bidNumbers = bid.numbers as string[];
        
        // This is a simplified check. A real-world scenario might need more complex logic.
        const isWinner = bidNumbers.some(num => newResult?.includes(num));
        
        if (isWinner) {
          winnersFound++;
          const winRate = WIN_RATES[bid.betType as keyof typeof WIN_RATES] || 0;
          const winningAmount = bid.amountPerBet * winRate;
          
          // Update bid status to 'won'
          batch.update(bidDoc.ref, { status: 'won', winningAmount });
          
          // Update user's balance
          const userDocRef = doc(db, 'users', bid.userId);
          batch.update(userDocRef, { balance: increment(winningAmount) });
        } else {
          // Update bid status to 'lost'
          batch.update(bidDoc.ref, { status: 'lost' });
        }
      });
      
      await batch.commit();
      
      form.setValue(`games.${gameIndex}.newResult`, '');
      form.clearErrors(`games.${gameIndex}.newResult`);

      toast({
        title: 'Result Published!',
        description: `Result for ${game.name} updated. ${winnersFound} winner(s) found and paid.`,
      });
    } catch (error) {
      console.error('Error updating result: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update result. Please try again.',
      });
    } finally {
      setIsSubmitting(null);
    }
  };


  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Update Game Results</CardTitle>
          <CardDescription>Update the results for all available games here. This will also process payouts.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
             <Form {...form}>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Game Name</TableHead>
                                <TableHead>Current Result</TableHead>
                                <TableHead>Session</TableHead>
                                <TableHead>New Result</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell>{field.name}</TableCell>
                                    <TableCell>{field.result}</TableCell>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`games.${index}.session`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select session" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open</SelectItem>
                                                            <SelectItem value="Close">Close</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`games.${index}.newResult`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="e.g. 123-6-789"
                                                            {...field} 
                                                            className="bg-input rounded-lg"
                                                         />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleUpdateResult(index)}
                                            disabled={!!isSubmitting}
                                        >
                                          {isSubmitting === field.id ? <Loader className="h-4 w-4" /> : 'Update'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                             ))}
                        </TableBody>
                    </Table>
                </div>
             </Form>
          )}
          {fields.length === 0 && !loading && (
              <p className="text-center text-muted-foreground mt-4">No games found. Please add a game first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
