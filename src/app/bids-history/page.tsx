
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Banknote, Phone } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AddPointsDialog } from '@/components/add-points-dialog';

interface Bid extends DocumentData {
    id: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    status: 'running' | 'won' | 'lost';
    createdAt: Timestamp;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
    telegramLink?: string;
}

export default function BidsHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings>({});

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid)
        );

        const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = [];
            querySnapshot.forEach((doc) => {
                bidsData.push({ id: doc.id, ...doc.data() } as Bid);
            });
            bidsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setBids(bidsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bids history: ", error);
            setLoading(false);
        });

        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            }
        });

        return () => {
            unsubscribeBids();
            unsubscribeSettings();
        };
    }, [user, authLoading, router]);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };
    
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'won': return 'secondary';
            case 'lost': return 'destructive';
            case 'running':
            default:
                return 'default';
        }
    }

    const handleWhatsAppSupport = () => {
        if (settings.whatsappNumber) {
            window.open(`https://wa.me/${settings.whatsappNumber}`, '_blank');
        }
    };

    const handleTelegramSupport = () => {
        if (settings.telegramLink) {
            window.open(settings.telegramLink, '_blank');
        }
    };
    
    const handleCallSupport = () => {
        if (settings.callSupportNumber) {
            window.location.href = `tel:${settings.callSupportNumber}`;
        }
    };


    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">Bids History</CardTitle>
                        <CardDescription>View all your past and current bids here.</CardDescription>
                         <div className="pt-4">
                            <Button asChild variant="ghost" className="pl-0">
                                <Link href="/" className="inline-flex items-center gap-2 text-sm text-green-500 hover:underline">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Game</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Numbers</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bids.map((bid) => (
                                        <TableRow key={bid.id}>
                                            <TableCell>{formatDate(bid.createdAt)}</TableCell>
                                            <TableCell>{bid.gameName} ({bid.session})</TableCell>
                                            <TableCell>{bid.betType}</TableCell>
                                            <TableCell>{bid.numbers.join(', ')}</TableCell>
                                            <TableCell>₹{bid.totalAmount}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={getStatusBadgeVariant(bid.status)}
                                                    className={bid.status === 'won' ? 'bg-green-500 text-white' : ''}
                                                >
                                                    {bid.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {bids.length === 0 && (
                            <p className="text-center text-muted-foreground mt-4">You haven't placed any bids yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            { user && (
                <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-white/10 p-2 z-50">
                    <div className="grid grid-cols-4 gap-2">
                        <AddPointsDialog user={user}>
                            <button className="flex flex-col items-center justify-center text-white text-xs gap-1 p-1 rounded-md bg-amber-500 hover:bg-amber-600">
                                <Banknote className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]" />
                                <span className="font-bold [text-shadow:1px_1px_2px_#000]">Deposit</span>
                            </button>
                        </AddPointsDialog>
                        <button
                        onClick={handleWhatsAppSupport}
                        disabled={!settings.whatsappNumber}
                        className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-green-500 hover:bg-green-600 p-1 rounded-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z" /></svg>
                            <span className="font-bold [text-shadow:1px_1px_2px_#000]">WhatsApp</span>
                        </button>
                        <button
                        onClick={handleTelegramSupport}
                        disabled={!settings.telegramLink}
                        className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-blue-500 hover:bg-blue-600 p-1 rounded-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]"><path d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.57c-.28 1.1-.86 1.32-1.74.84l-4.97-3.6-2.44 2.34c-.27.27-.5.4-.85.4z" /></svg>
                            <span className="font-bold [text-shadow:1px_1px_2px_#000]">Telegram</span>
                        </button>
                        <button
                        onClick={handleCallSupport}
                        disabled={!settings.callSupportNumber}
                        className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-red-500 hover:bg-red-600 p-1 rounded-md"
                        >
                            <Phone className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]" />
                            <span className="font-bold [text-shadow:1px_1px_2px_#000]">Call Support</span>
                        </button>
                    </div>
                </footer>
            )}
        </div>
    )
}
