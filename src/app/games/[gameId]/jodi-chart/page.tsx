
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Game extends DocumentData {
  id: string;
  name: string;
}

interface WinningBid extends DocumentData {
    id: string;
    createdAt: Timestamp;
    numbers: string[];
    betType: string;
}

export default function JodiChartPage() {
    const { gameId } = useParams();
    const router = useRouter();
    const [game, setGame] = useState<Game | null>(null);
    const [winningHistory, setWinningHistory] = useState<WinningBid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof gameId !== 'string') return;

        const fetchGameDetails = async () => {
            const gameDocRef = doc(db, 'games', gameId);
            const gameDoc = await getDoc(gameDocRef);
            if (gameDoc.exists()) {
                setGame({ id: gameDoc.id, ...gameDoc.data() } as Game);
            } else {
                router.push('/');
            }
        };

        fetchGameDetails();

        // Simplified query to avoid composite index requirement.
        // We will filter and sort on the client side.
        const historyQuery = query(
            collection(db, 'bids'),
            where('gameId', '==', gameId),
            where('status', '==', 'won')
        );

        const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
            const jodiWins: WinningBid[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.betType === 'Jodi Digit') {
                    jodiWins.push({ id: doc.id, ...data } as WinningBid);
                }
            });

            // Sort the data on the client side by date
            jodiWins.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            
            setWinningHistory(jodiWins.slice(0, 30)); // Limit to latest 30 results
            setLoading(false);
        }, (error) => {
            console.error("Error fetching Jodi chart data:", error);
            setLoading(false);
        });


        return () => unsubscribe();
    }, [gameId, router]);


    if (loading) {
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
                        <CardTitle className="text-2xl sm:text-3xl">
                            Jodi Chart - {game?.name}
                        </CardTitle>
                        <CardDescription>
                            Recent winning Jodi numbers for this game.
                        </CardDescription>
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
                        {winningHistory.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-center">Winning Jodi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {winningHistory.map((win) => (
                                            <TableRow key={win.id}>
                                                <TableCell>{format(win.createdAt.toDate(), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-center font-bold text-lg text-primary">
                                                    {/* Assuming the first winning number is the Jodi */}
                                                    {win.numbers[0]}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground mt-4">
                                No recent Jodi win history found for this game.
                             </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
