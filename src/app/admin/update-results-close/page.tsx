
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, query, onSnapshot, orderBy, DocumentData, writeBatch, doc, where, getDocs, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as z from 'zod';

const formSchema = z.object({
  games: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      openResult: z.string(),
      closeResult: z.string(),
      newClosePana: z.string().optional(),
    })
  ),
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
  'Single Pana': 100,
  'Double Pana': 300,
  'Triple Pana': 600,
};

// Helper to calculate jodi from pana
const calculateJodiDigit = (pana: string): string => {
    if (!pana || pana.length !== 3 || !/^\d+$/.test(pana)) return '';
    return (pana.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
};

const parseDateString = (dateStr: string): Date | null => {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    // JS months are 0-indexed
    return new Date(year, month - 1, day);
};


export default function UpdateResultsClosePage() {
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
    const q = query(collection(db, "games"), orderBy("openTime", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      replace(gamesData.map(g => ({...g, newClosePana: ''})));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [replace]);

  const handleUpdateResult = async (gameIndex: number) => {
    const game = form.getValues(`games.${gameIndex}`);
    const newClosePana = game.newClosePana;
    
    if (!newClosePana || newClosePana.length !== 3) {
      form.setError(`games.${gameIndex}.newClosePana`, {
        type: 'manual',
        message: 'Pana must be 3 digits.',
      });
      return;
    }
    
    setIsSubmitting(game.id);

    const closeJodiDigit = calculateJodiDigit(newClosePana);
    
    try {
        const batch = writeBatch(db);
        const gameDocRef = doc(db, 'games', game.id);
        const gameDocSnap = await getDoc(gameDocRef);
        const currentGameData = gameDocSnap.data();
        
        const openPana = currentGameData?.openResult || '***';
        const openJodiDigit = calculateJodiDigit(openPana);
        const finalJodi = `${openJodiDigit}${closeJodiDigit}`;
        const finalResult = `${openPana}-${finalJodi}-${newClosePana}`;

        // Update the close result and the final combined result string
        batch.update(gameDocRef, { 
            closeResult: newClosePana,
            closeJodiDigit: closeJodiDigit,
            result: finalResult,
        });
        
        // --- AUTO UPDATE PANEL CHART ---
        const panelChartDocRef = doc(db, 'panelCharts', game.id);
        const panelChartDocSnap = await getDoc(panelChartDocRef);
        if (panelChartDocSnap.exists()) {
            const chartData = panelChartDocSnap.data();
            let currentChartData = chartData.data || '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dataRows = currentChartData.split('\n').filter(row => row.trim() !== '');
            let chartWasUpdated = false;

            const updatedRows = dataRows.map(row => {
                const dateRangeMatch = row.match(/(\d{2}\/\d{2}\/\d{4})\s*to\s*(\d{2}\/\d{2}\/\d{4})/);
                if (!dateRangeMatch || chartWasUpdated) {
                    return row;
                }

                const startDate = parseDateString(dateRangeMatch[1]);
                const endDate = parseDateString(dateRangeMatch[2]);
                
                if (startDate && endDate && today >= startDate && today <= endDate) {
                    chartWasUpdated = true;
                    
                    const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1
                    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday - 0, Sunday - 6

                    const dataPart = row.substring(dateRangeMatch[0].length).trim();
                    const dataEntries = dataPart.split(/\s+/).filter(Boolean);
                    
                    const newDataForDay = `${openPana}${finalJodi}${newClosePana}`;
                    
                    while (dataEntries.length < 7) {
                        dataEntries.push('********'); // Placeholder for a full day's data
                    }

                    dataEntries[dayIndex] = newDataForDay;
                    
                    return `${dateRangeMatch[0]} ${dataEntries.join(' ')}`;
                }
                return row;
            });

            if (chartWasUpdated) {
                batch.update(panelChartDocRef, { data: updatedRows.join('\n') });
            }
        }
        // --- END AUTO UPDATE PANEL CHART ---

        // Process bets for Close Pana, Close Single Digit, and Jodi Digit
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

            if (bid.session === 'Close') {
                if (bid.betType.includes('Pana') && bidNumbers.includes(newClosePana)) {
                    isWinner = true;
                } else if (bid.betType === 'Single Digit' && bidNumbers.includes(closeJodiDigit)) {
                    isWinner = true;
                }
            } else if (bid.betType === 'Jodi Digit' && bidNumbers.includes(finalJodi)) {
                isWinner = true;
            }
            
            if (isWinner) {
                winnersFound++;
                winningAmount = amountPerNumber * winRate;
                totalWinningAmount += winningAmount;
                
                batch.update(bidDoc.ref, { status: 'won', winningAmount });
                
                const userDocRef = doc(db, 'users', bid.userId);
                batch.update(userDocRef, { balance: increment(winningAmount) });
            } else {
                batch.update(bidDoc.ref, { status: 'lost' });
            }
        });
        
        await batch.commit();
        
        form.setValue(`games.${gameIndex}.newClosePana`, '');
        form.clearErrors(`games.${gameIndex}.newClosePana`);

        toast({
            title: 'Result Published!',
            description: `Close result for ${game.name} updated. ${winnersFound} winner(s) found. Jodi and Panel charts updated.`,
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
          <CardTitle className="text-2xl">Update Game Results (Close)</CardTitle>
          <CardDescription>Update the Close Pana results here. Close Jodi and the final Jodi will be calculated automatically.</CardDescription>
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
                                <TableHead>New Close Pana</TableHead>
                                <TableHead>Auto Jodi (Close)</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell>{field.name}</TableCell>
                                    <TableCell>{field.result || `${field.openResult || '***'}-**-${field.closeResult || '**'}`}</TableCell>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name={`games.${index}.newClosePana`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="Enter 3-digit pana"
                                                            {...field} 
                                                            className="bg-input rounded-lg"
                                                            maxLength={3}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                form.trigger(`games.${index}.newClosePana`);
                                                            }}
                                                         />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            readOnly
                                            value={calculateJodiDigit(form.watch(`games.${index}.newClosePana`) || '')}
                                            className="bg-muted border-none font-bold text-center"
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
