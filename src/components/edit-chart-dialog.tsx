'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Edit } from 'lucide-react';

const editChartSchema = z.object({
  title: z.string().min(1, 'Chart title is required'),
  data: z.string().min(1, 'Chart data is required'),
});

type EditChartFormValues = z.infer<typeof editChartSchema>;

interface EditChartDialogProps {
  chart: DocumentData;
  collectionName: 'jodiCharts' | 'panelCharts';
  children: React.ReactNode;
}

export function EditChartDialog({ chart, collectionName, children }: EditChartDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditChartFormValues>({
    resolver: zodResolver(editChartSchema),
    defaultValues: {
      title: chart.title,
      data: chart.data,
    },
  });

  const onSubmit = async (values: EditChartFormValues) => {
    setIsSubmitting(true);
    const chartDocRef = doc(db, collectionName, chart.id);

    try {
      await updateDoc(chartDocRef, values);
      toast({
        title: 'Success!',
        description: 'Chart has been updated.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating chart: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update chart. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Chart for {chart.gameName}</DialogTitle>
          <DialogDescription>
            Make changes to the chart details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      className="min-h-[250px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
               <DialogClose asChild>
                    <Button type="button" variant="outline">
                        Cancel
                    </Button>
               </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
