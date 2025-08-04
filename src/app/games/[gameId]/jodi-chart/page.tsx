
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
    result: string; // The full result like "123-68-459"
}

const calculateJodiDigit = (pana: string): string => {
    if (!pana || pana.length !== 3 || !/^\d+$/.test(pana)) return '';
    return (pana.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
};

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

        // Querying winning bids is complex. We'll fetch recent game states instead.
        // For a true Jodi chart, you would typically have a separate collection
        // storing daily results. Here's an approximation using the bids collection.
        // A better approach is to create a 'results' collection.
        // For now, let's fetch the last 30 winning bids for this game to simulate a chart.
        const historyQuery = query(
            collection(db, 'bids'),
            where('gameId', '==', gameId),
            where('status', '==', 'won'),
            where('betType', '==', 'Jodi Digit'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );
        
        // This is a simplified approach. A more robust solution would be to have a `results` collection
        // that stores the final result for each game each day.
        // Let's use the game document's own `result` history if available, or fetch winning bids.
        // Since we don't store historical results, we'll just show the latest winning Jodi bids.
        
        const bidsQuery = query(
            collection(db, "bids"),
            where("gameId", "==", gameId),
            where("status", "==", "won"),
            orderBy("createdAt", "desc"),
            limit(50) // Fetch last 50 winning bids
        );

        const unsubscribe = onSnapshot(bidsQuery, (snapshot) => {
            const history: WinningBid[] = [];
            const addedDates: Set<string> = new Set();
            
            // This logic is tricky because one result can have many winners.
            // We need to find the unique results for each day.
            // For now, let's just show the winning Jodi numbers from bids.
            snapshot.forEach(doc => {
                 const bid = doc.data();
                 const date = format(bid.createdAt.toDate(), 'yyyy-MM-dd');
                 
                 // We need the final game result to extract the Jodi
                 // This info is not on the bid document.
                 // This is a placeholder. For a real chart, a `results` collection is needed.
            });
            
            // A better, simpler approach for now: show the most recent winning jodi bids.
            const jodiWins = snapshot.docs
                .filter(doc => doc.data().betType === 'Jodi Digit')
                .map(doc => doc.data() as WinningBid);
            
            setWinningHistory(jodiWins);
            setLoading(false);
        });


        return () => unsubscribe();
    }, [gameId, router]);

    const getJodiFromResult = (resultString: string) => {
        if (!resultString || typeof resultString !== 'string') return '**';
        const parts = resultString.split('-');
        return parts.length === 3 ? parts[1] : '**';
    }


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
