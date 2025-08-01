
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';

interface Game extends DocumentData {
    id: string;
    name: string;
    openTime: string;
    closeTime: string;
}

export default function RateCardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const gamesQuery = query(collection(db, 'games'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(gamesQuery, (querySnapshot) => {
            const gamesData: Game[] = [];
            querySnapshot.forEach((doc) => {
                gamesData.push({ id: doc.id, ...doc.data() } as Game);
            });
            setGames(gamesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching games: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">Game Rates</CardTitle>
                        <CardDescription>Here you can see the betting rates for all games.</CardDescription>
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
                                        <TableHead>Game Name</TableHead>
                                        <TableHead>Open Time</TableHead>
                                        <TableHead>Close Time</TableHead>
                                        <TableHead>Single Digit</TableHead>
                                        <TableHead>Jodi Digit</TableHead>
                                        <TableHead>Single Pana</TableHead>
                                        <TableHead>Double Pana</TableHead>
                                        <TableHead>Triple Pana</TableHead>
                                        <TableHead>Half Sangam</TableHead>
                                        <TableHead>Full Sangam</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {games.map((game) => (
                                        <TableRow key={game.id}>
                                            <TableCell>{game.name}</TableCell>
                                            <TableCell>{formatTime(game.openTime)}</TableCell>
                                            <TableCell>{formatTime(game.closeTime)}</TableCell>
                                            <TableCell>₹10 - ₹100</TableCell>
                                            <TableCell>₹10 - ₹1000</TableCell>
                                            <TableCell>₹10 - ₹1000</TableCell>
                                            <TableCell>₹10 - ₹3000</TableCell>
                                            <TableCell>₹10 - ₹6000</TableCell>
                                            <TableCell>₹10 - ₹5000</TableCell>
                                            <TableCell>₹10 - ₹10000</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {games.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground mt-4">No games available to show rates.</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-4">All rates are based on a ₹10 bet.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
