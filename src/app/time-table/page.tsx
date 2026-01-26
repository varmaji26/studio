'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
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

export default function TimeTablePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const gamesQuery = query(collection(db, 'games'), orderBy('openTime', 'asc'));
        const unsubscribe = onSnapshot(gamesQuery, (querySnapshot) => {
            const gamesData: Game[] = [];
            querySnapshot.forEach((doc) => {
                gamesData.push({ id: doc.id, ...doc.data() } as Game);
            });
            setGames(gamesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background text-foreground p-2 sm:p-4">
            <div className="max-w-4xl mx-auto mb-28">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader className="text-center relative">
                         <Link href="/" replace className="absolute left-4 top-1/2 -translate-y-1/2">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
                            Time Table
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#004D40]/80 hover:bg-[#004D40]">
                                        <TableHead className="text-white font-bold">Game Name</TableHead>
                                        <TableHead className="text-white font-bold text-center">Open Time</TableHead>
                                        <TableHead className="text-white font-bold text-center">Close Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {games.map((game) => (
                                        <TableRow key={game.id} className="border-b-white/10">
                                            <TableCell className="font-medium">{game.name}</TableCell>
                                            <TableCell className="text-center">{formatTime(game.openTime)}</TableCell>
                                            <TableCell className="text-center">{formatTime(game.closeTime)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             {games.length === 0 && !loading && (
                                <p className="text-center text-muted-foreground py-10">No games found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
