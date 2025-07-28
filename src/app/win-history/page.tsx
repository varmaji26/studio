
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Win extends DocumentData {
    id: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    winningAmount: number;
    status: 'won';
    createdAt: Timestamp;
}

export default function WinHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [wins, setWins] = useState<Win[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const winsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid),
            where('status', '==', 'won'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(winsQuery, (querySnapshot) => {
            const winsData: Win[] = [];
            querySnapshot.forEach((doc) => {
                winsData.push({ id: doc.id, ...doc.data() } as Win);
            });
            setWins(winsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching wins history: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, router]);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };
    
    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2">
                            <Trophy className="text-amber-400" />
                            Win History
                        </CardTitle>
                        <CardDescription>A record of all your winning bids.</CardDescription>
                         <div className="pt-4">
                            <Button asChild variant="ghost" className="pl-0">
                                <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
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
                                        <TableHead>Bet Details</TableHead>
                                        <TableHead>Bet Amount</TableHead>
                                        <TableHead>Win Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wins.map((win) => (
                                        <TableRow key={win.id}>
                                            <TableCell>{formatDate(win.createdAt)}</TableCell>
                                            <TableCell>{win.gameName} ({win.session})</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{win.betType}</span>
                                                    <span className="text-xs text-muted-foreground">{win.numbers.join(', ')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>₹{win.totalAmount}</TableCell>
                                            <TableCell className="font-bold text-green-400">
                                                ₹{win.winningAmount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {wins.length === 0 && (
                            <div className="text-center py-10">
                                <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">You haven't won any bids yet. Keep playing!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
