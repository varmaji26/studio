
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, onSnapshot, doc, setDoc, deleteDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface JodiChart extends DocumentData {
    id: string;
    gameName: string;
    title: string;
    data: string;
}

const chartSchema = z.object({
  gameName: z.string().min(1, 'Game name is required'),
  title: z.string().min(1, 'Chart title is required'),
  data: z.string().min(1, 'Chart data is required'),
});

type ChartFormValues = z.infer<typeof chartSchema>;

export default function JodiPanelPage() {
  const [charts, setCharts] = useState<JodiChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChartFormValues>({
    resolver: zodResolver(chartSchema),
  });

  const fetchCharts = useCallback(() => {
    setLoading(true);
    const q = collection(db, "jodiCharts");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chartsData: JodiChart[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JodiChart));
      setCharts(chartsData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchCharts();
    return () => unsubscribe();
  }, [fetchCharts]);

  const onSubmit = async (values: ChartFormValues) => {
    try {
      const docRef = doc(db, 'jodiCharts', values.gameName.toLowerCase().replace(/\s+/g, '-'));
      await setDoc(docRef, values);
      toast({ title: 'Success', description: 'Chart saved successfully.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving chart: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save chart.' });
    }
  };

  const handleDelete = async (chartId: string) => {
    try {
      await deleteDoc(doc(db, 'jodiCharts', chartId));
      toast({ title: 'Success', description: 'Chart deleted successfully.' });
    } catch (error) {
      console.error("Error deleting chart: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete chart.' });
    }
  };
  
  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Jodi Panel Charts</CardTitle>
            <CardDescription>Manage Jodi Panel calendar charts for each game.</CardDescription>
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
                <DialogTitle>Add New Jodi Chart</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="gameName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Game Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Sridevi" {...field} />
                                    </FormControl>
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
                                        <Input placeholder="e.g., SRIDEVI MATKA JODI RECORD 2018 - 2025" {...field} />
                                    </FormControl>
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
                                        placeholder="Enter numbers separated by spaces or new lines. Example: 08 85 06..."
                                        className="min-h-[200px]"
                                        {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter all numbers in order. They will automatically wrap into a 7-column grid. Use '*' for empty cells.
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
          {loading ? <div className="flex justify-center"><Loader/></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game Name</TableHead>
                  <TableHead>Chart Title</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.gameName}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {charts.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  No charts found. Click "Add New Chart" to create one.
                </p>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
