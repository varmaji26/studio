

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, query, onSnapshot, orderBy, DocumentData, Timestamp, getDocs, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { sendPushNotifications } from '@/actions/send-notification';


const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  message: z.string().min(1, 'Message is required.'),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

interface Notification extends DocumentData {
    id: string;
    title: string;
    message: string;
    createdAt: Timestamp;
}

export default function SendNotificationPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
    },
  });

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribeNotifications = onSnapshot(q, (querySnapshot) => {
      const notificationsData: Notification[] = [];
      querySnapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notificationsData);
      setLoading(false);
    });

    const settingsDocRef = doc(db, 'settings', 'app-settings');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setNotificationsEnabled(data.notifications?.enabled ?? true);
        }
    });

    return () => {
        unsubscribeNotifications();
        unsubscribeSettings();
    };
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        await updateDoc(settingsDocRef, { 'notifications.enabled': enabled }, { merge: true });
        toast({
            title: 'Success!',
            description: `Notifications have been ${enabled ? 'enabled' : 'disabled'}.`
        });
    } catch (error) {
        console.error('Error toggling notifications:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update notification settings.'
        });
        setNotificationsEnabled(!enabled); 
    }
  };

  const onSubmit = async (values: NotificationFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await sendPushNotifications(values);
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
        form.reset();
      } else {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
      }
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

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
        const notificationsQuery = query(collection(db, 'notifications'));
        const querySnapshot = await getDocs(notificationsQuery);
        
        if (querySnapshot.empty) {
            toast({ title: 'History is already empty.' });
            setIsClearing(false);
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        toast({
            title: 'Success!',
            description: 'Notification history has been cleared.'
        });
    } catch (error) {
        console.error('Error clearing history:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to clear notification history.'
        });
    } finally {
        setIsClearing(false);
    }
  };


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="grid gap-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">Send Notification</CardTitle>
                    <CardDescription>Send a message to all application users. This will appear as a push notification in their app.</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                        id="notifications-enabled"
                        checked={notificationsEnabled}
                        onCheckedChange={handleToggleNotifications}
                    />
                    <Label htmlFor="notifications-enabled" className="text-sm">
                        {notificationsEnabled ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Important Update" {...field} className="bg-input h-12 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter the message you want to send..." {...field} className="bg-input rounded-lg min-h-[120px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold" disabled={isSubmitting}>
                    {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                    Send Notification
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl">Sent Notifications History</CardTitle>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={notifications.length === 0 || isClearing}>
                           {isClearing ? <Loader className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                           Clear History
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all sent notifications.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearHistory}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </div>
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
                                  <TableHead>Date</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Message</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {notifications.map((notification) => (
                                <TableRow key={notification.id}>
                                    <TableCell>{formatDate(notification.createdAt)}</TableCell>
                                    <TableCell>{notification.title}</TableCell>
                                    <TableCell>{notification.message}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              )}
              {notifications.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground mt-4">No notifications have been sent yet.</p>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
