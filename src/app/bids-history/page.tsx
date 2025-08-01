
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
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

export default function BidsHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid)
            // The orderBy clause is removed to prevent the composite index error.
            // We will sort the data on the client-side.
        );

        const unsubscribe = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = [];
            querySnapshot.forEach((doc) => {
                bidsData.push({ id: doc.id, ...doc.data() } as Bid);
            });
            // Sort bids by creation date in descending order on the client
            bidsData.sort((a, b) => {
                const dateA = a.createdAt?.toMillis() || 0;
                const dateB = b.createdAt?.toMillis() || 0;
                return dateB - dateA;
            });
            setBids(bidsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bids history: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
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
        </div>
    )
}
