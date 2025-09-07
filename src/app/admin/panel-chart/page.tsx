
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, onSnapshot, doc, setDoc, deleteDoc, DocumentData, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditChartDialog } from '@/components/edit-chart-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface PanelChart extends DocumentData {
    id: string;
    gameName: string;
    title: string;
    data: string;
    activeDays?: string[];
}

interface Game extends DocumentData {
    id: string;
    name: string;
    openTime: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const chartSchema = z.object({
  gameId: z.string().min(1, 'Please select a game'),
  title: z.string().min(1, 'Chart title is required'),
  data: z.string().min(1, 'Chart data is required'),
  activeDays: z.array(z.string()).refine((value) => value.some((day) => day), {
    message: "You have to select at least one day.",
  }),
});

type ChartFormValues = z.infer<typeof chartSchema>;

export default function PanelChartPage() {
  const [charts, setCharts] = useState<PanelChart[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartSchema),
    defaultValues: {
        gameId: '',
        title: '',
        data: '',
        activeDays: daysOfWeek,
    }
  });

  const fetchChartsAndGames = useCallback(() => {
    setLoading(true);
    
    const gamesQuery = query(collection(db, "games"), orderBy("openTime", "asc"));
    const unsubscribeGames = onSnapshot(gamesQuery, (gamesSnapshot) => {
        const gamesData: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
        setGames(gamesData);

        const chartsQuery = collection(db, "panelCharts");
        const unsubscribeCharts = onSnapshot(chartsQuery, (chartsSnapshot) => {
            const chartsData: PanelChart[] = chartsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PanelChart));
            
            const gameTimeMap = new Map(gamesData.map(game => [game.id, game.openTime]));

            chartsData.sort((a, b) => {
                const timeA = gameTimeMap.get(a.id) || '23:59';
                const timeB = gameTimeMap.get(b.id) || '23:59';
                return timeA.localeCompare(timeB);
            });
            
            setCharts(chartsData);
            setLoading(false);
        });
        
        return () => unsubscribeCharts();
    });
    
    return () => {
        unsubscribeGames();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = fetchChartsAndGames();
    return () => unsubscribe();
  }, [fetchChartsAndGames]);

  const onSubmit = async (values: ChartFormValues) => {
    try {
      const selectedGame = games.find(g => g.id === values.gameId);
      if (!selectedGame) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected game not found.' });
        return;
      }

      const docRef = doc(db, 'panelCharts', values.gameId);
      await setDoc(docRef, {
          gameName: selectedGame.name,
          title: values.title,
          data: values.data,
          activeDays: values.activeDays,
      });
      toast({ title: 'Success', description: 'Panel chart saved successfully.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving chart: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save chart.' });
    }
  };

  const handleDelete = async (chartId: string) => {
    try {
      await deleteDoc(doc(db, 'panelCharts', chartId));
      toast({ title: 'Success', description: 'Chart deleted successfully.' });
    } catch (error) {
      console.error("Error deleting chart: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete chart.' });
    }
  };

  const filteredCharts = useMemo(() => {
    if (!selectedGameId) {
        return [];
    }
    return charts.filter(chart => chart.id === selectedGameId);
  }, [charts, selectedGameId]);
  
  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Manage Panel Charts</CardTitle>
            <CardDescription>Manage Panel calendar charts for each game.</CardDescription>
          </div>
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Chart
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>Add New Panel Chart</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="gameId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Game</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a game" />
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chart Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., SRIDEVI MATKA PANEL RECORD 2018 - 2025" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="activeDays"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Chart Active Days</FormLabel>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {daysOfWeek.map((day) => (
                                    <FormField
                                        key={day}
                                        control={form.control}
                                        name="activeDays"
                                        render={({ field }) => {
                                        return (
                                            <FormItem
                                            key={day}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value?.includes(day)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...(field.value || []), day])
                                                    : field.onChange(
                                                        (field.value || [])?.filter(
                                                            (value) => value !== day
                                                        )
                                                        )
                                                }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                {day}
                                            </FormLabel>
                                            </FormItem>
                                        )
                                        }}
                                    />
                                    ))}
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="data"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chart Data</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        placeholder="Enter data row by row. Ex: DateRange OpenPana Jodi ClosePana OpenPana Jodi ClosePana..."
                                        className="min-h-[200px]"
                                        {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter data for each row separated by spaces. A new line for each week.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="flex justify-end gap-2">
                             <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                             </DialogClose>
                            <Button type="submit">Save Chart</Button>
                         </div>
                    </form>
                </Form>
            </DialogContent>
           </Dialog>
        </CardHeader>
        <CardContent>
           <div className="mb-4">
                <Select value={selectedGameId} onValueChange={(value) => setSelectedGameId(value)}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Filter by game..." />
                    </SelectTrigger>
                    <SelectContent>
                        {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                                {game.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          {loading ? <div className="flex justify-center"><Loader/></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Chart Title</TableHead>
                  <TableHead>Active Days</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCharts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.gameName}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell className="text-xs">{(item.activeDays || []).join(', ')}</TableCell>
                    <TableCell className="text-right">
                       <div className="flex gap-2 justify-end">
                          <EditChartDialog chart={item} collectionName="panelCharts">
                             <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                          </EditChartDialog>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the chart.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {filteredCharts.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {selectedGameId ? "No chart found for the selected game." : "Please select a game to view its chart."}
                </p>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
