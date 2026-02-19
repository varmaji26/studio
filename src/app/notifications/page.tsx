'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, onSnapshot, orderBy, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Notification extends DocumentData {
    id: string;
    title: string;
    body: string;
    createdAt: Timestamp;
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);

    useEffect(() => {
        try {
            const storedDeletedIds = JSON.parse(localStorage.getItem('deletedNotificationIds') || '[]');
            setDeletedIds(storedDeletedIds);
        } catch (e) {
            console.error("Failed to parse deletedNotificationIds from localStorage", e);
            setDeletedIds([]);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notificationsData: Notification[] = [];
            querySnapshot.forEach((doc) => {
                notificationsData.push({ id: doc.id, ...doc.data() } as Notification);
            });
            setNotifications(notificationsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    const handleDelete = (idToDelete: string) => {
        const newDeletedIds = [...deletedIds, idToDelete];
        setDeletedIds(newDeletedIds);
        localStorage.setItem('deletedNotificationIds', JSON.stringify(newDeletedIds));
        window.dispatchEvent(new Event('storage')); // Notify other tabs/components to update unread count
    };

    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    const visibleNotifications = notifications.filter(n => !deletedIds.includes(n.id));

    return (
        <div className="dark min-h-screen bg-background text-foreground">
            <header className="p-4 flex items-center gap-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10">
                <Link href="/" replace>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Notifications</h1>
            </header>

            <main className="p-4 space-y-4">
                {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((n, index) => (
                        <div key={n.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative animate-breathe">
                             <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-red-500/20 hover:text-red-400" onClick={() => handleDelete(n.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <h2 className="text-lg font-bold text-primary flex items-center gap-2 pr-8">
                                {index + 1}. {n.title}
                            </h2>
                            <p className="text-sm text-white mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                                {n.body}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-4 text-right">
                                {n.createdAt ? format(n.createdAt.toDate(), "PPP p") : ''}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">No notifications yet.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
