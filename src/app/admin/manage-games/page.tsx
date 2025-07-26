
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, DocumentData, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditGameDialog } from '@/components/edit-game-dialog';


const gameSchema = z.object({
  name: z.string().min(1, 'Game name is required.'),
  result: z.string().min(1, 'Result is required.'),
  status: z.string().min(1, 'Status is required.'),
  openTime: z.string().min(1, 'Open time is required.'),
  closeTime: z.string().min(1, 'Close time is required.'),
});

type GameFormValues = z.infer<typeof gameSchema>;

interface Game extends DocumentData {
    id: string;
    name: string;
    openTime: string;
    closeTime: string;
    status: string;
}

export default function ManageGamesPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      name: '',
      result: '***-*-***',
      status: 'Betting will open soon',
      openTime: '',
      closeTime: '',
    },
  });
  
   useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: GameFormValues) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'games'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Success!',
        description: 'New game has been added.',
      });
      form.reset();
    } catch (error) {
      console.error('Error adding document: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add the game. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteGame = async (gameId: string) => {
    try {
        await deleteDoc(doc(db, "games", gameId));
        toast({
            title: 'Success!',
            description: 'Game has been deleted.'
        });
    } catch (error) {
        console.error("Error deleting game: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete game. Please try again.',
        });
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Add New Game</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Milan Night" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="result"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Game Result</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123-6-789" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Betting Status</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="openTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Open Time</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 08:50 PM" {...field} className="bg-input h-12 rounded-lg" type="time" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="closeTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Close Time</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., 10:50 PM" {...field} className="bg-input h-12 rounded-lg" type="time" />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_theme(colors.primary/40%)]" disabled={isSubmitting}>
                  {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                  Add Game
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">All Games</CardTitle>
            <CardDescription>View, edit, or delete existing games.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Game Name</TableHead>
                                <TableHead>Open Time</TableHead>
                                <TableHead>Close Time</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {games.map((game, index) => (
                                <TableRow key={game.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{game.name}</TableCell>
                                    <TableCell>{game.openTime}</TableCell>
                                    <TableCell>{game.closeTime}</TableCell>
                                    <TableCell>
                                        <Badge className={game.status.toLowerCase() === 'active' ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'}>
                                            {game.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <EditGameDialog game={game}>
                                                 <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400">Edit</Button>
                                            </EditGameDialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive">Delete</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the game.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteGame(game.id)}>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {games.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">No games found. Add a new game to get started.</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
