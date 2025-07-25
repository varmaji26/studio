
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';

const gameSchema = z.object({
  name: z.string().min(1, 'Game name is required.'),
  result: z.string().min(1, 'Result is required.'),
  status: z.string().min(1, 'Status is required.'),
  openTime: z.string().min(1, 'Open time is required.'),
  closeTime: z.string().min(1, 'Close time is required.'),
});

type GameFormValues = z.infer<typeof gameSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      name: '',
      result: '',
      status: 'Betting will open soon',
      openTime: '',
      closeTime: '',
    },
  });

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

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary">Admin Panel</h1>
        <p className="text-muted-foreground">Add and manage Matka games.</p>
      </header>
      <main>
        <Card className="max-w-2xl mx-auto bg-card/80 border-white/10 shadow-lg">
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
                      <FormLabel>Game Result</FormLabel>
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
                      <FormLabel>Betting Status</FormLabel>
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
                            <Input placeholder="e.g., 08:50 PM" {...field} className="bg-input h-12 rounded-lg" />
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
                            <Input placeholder="e.g., 10:50 PM" {...field} className="bg-input h-12 rounded-lg" />
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
      </main>
    </div>
  );
}
