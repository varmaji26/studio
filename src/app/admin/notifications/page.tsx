'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, DocumentData, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  body: z.string().min(1, 'Message body is required.'),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface Notification extends DocumentData {
    id: string;
    title: string;
    body: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    } | null;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      body: '',
    },
  });

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsData: Notification[] = [];
      querySnapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notificationsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: NotificationFormValues) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Success!',
        description: 'Notification has been sent to all users.',
      });
      form.reset();
    } catch (error) {
      console.error('Error sending notification: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send notification. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast({
        title: 'Deleted!',
        description: 'Notification has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting notification: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete notification.',
      });
    }
  };

  const handleResend = async (notification: Notification) => {
    setResendingId(notification.id);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: notification.title,
        body: notification.body,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Success!',
        description: 'Notification has been resent.',
      });
    } catch (error) {
      console.error('Error resending notification: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to resend notification. Please try again.',
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Send a message to all application users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter notification title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter notification message" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
                Send Notification
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>A list of recently sent notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader />
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h4 className="font-bold">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground" style={{ whiteSpace: 'pre-wrap' }}>{notification.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.createdAt ? format(notification.createdAt.seconds * 1000, 'PPpp') : '...'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleResend(notification)}
                        disabled={!!resendingId}
                    >
                        {resendingId === notification.id && <Loader className="mr-2 h-4 w-4" />}
                        Resend
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the notification.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(notification.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
