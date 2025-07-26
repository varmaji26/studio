
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, onSnapshot, orderBy, DocumentData, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const resultSchema = z.object({
  result: z.string().regex(/^\d{3}-\d{1,2}-\d{3}$/, 'Result must be in format XXX-XX-XXX or XXX-X-XXX'),
});

const formSchema = z.object({
  games: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      result: z.string(),
      newResult: z.string().optional(),
    })
  ),
});

type GameResultFormValues = z.infer<typeof formSchema>;

interface Game extends DocumentData {
    id: string;
    name: string;
    result: string;
}

export default function UpdateResultsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      replace(gamesData.map(g => ({...g, newResult: ''})));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [replace]);

  const handleUpdateResult = async (gameIndex: number) => {
    const game = form.getValues(`games.${gameIndex}`);
    const newResult = game.newResult;

    if (!newResult) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a result to update.' });
        return;
    }

    const resultValidation = resultSchema.safeParse({ result: newResult });
    if (!resultValidation.success) {
      form.setError(`games.${gameIndex}.newResult`, {
        type: 'manual',
        message: 'Result must be in format XXX-XX-XXX or XXX-X-XXX',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const gameDocRef = doc(db, 'games', game.id);
      await writeBatch(db).update(gameDocRef, { result: newResult }).commit();
      
      form.setValue(`games.${gameIndex}.newResult`, '');
      form.clearErrors(`games.${gameIndex}.newResult`);

      toast({
        title: 'Success!',
        description: `Result for ${game.name} has been updated.`,
      });
    } catch (error) {
      console.error('Error updating result: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update result. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Update Game Results</CardTitle>
          <CardDescription>Update the results for all available games here.</CardDescription>
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
                                            disabled={isSubmitting}
                                        >
                                          {isSubmitting ? <Loader className="h-4 w-4" /> : 'Update'}
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
