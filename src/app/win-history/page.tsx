
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


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

const ITEMS_PER_PAGE = 10;

export default function WinHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [wins, setWins] = useState<Win[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    const fetchWins = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const winsQuery = query(
                collection(db, 'bids'),
                where('userId', '==', user.uid),
                where('status', '==', 'won')
            );
            const querySnapshot = await getDocs(winsQuery);
            const winsData: Win[] = [];
            querySnapshot.forEach((doc) => {
                winsData.push({ id: doc.id, ...doc.data() } as Win);
            });
            // Sort client-side
            winsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setWins(winsData);
        } catch (error) {
            console.error("Error fetching wins history: ", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        fetchWins();
    }, [user, authLoading, router, fetchWins]);

    const filteredWins = useMemo(() => {
        if (!selectedDate) {
            return wins;
        }
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        return wins.filter(win => {
            const winDate = win.createdAt.toDate();
            return winDate >= startOfDay && winDate <= endOfDay;
        });
    }, [wins, selectedDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate]);
    
    const totalPages = Math.ceil(filteredWins.length / ITEMS_PER_PAGE);
    const paginatedWins = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredWins.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredWins, currentPage]);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };
    
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
                <div>
                    Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredWins.length)}</strong> of <strong>{filteredWins.length}</strong> entries
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        )
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
                        <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2">
                            <Trophy className="text-amber-400" />
                            Win History
                        </CardTitle>
                        <CardDescription>A record of all your winning bids.</CardDescription>
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
                        <div className="flex justify-end mb-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[280px] justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
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
                                    {paginatedWins.map((win) => (
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
                        {filteredWins.length === 0 && !loading && (
                            <div className="text-center py-10">
                                <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">
                                {selectedDate ? `You have no wins on ${format(selectedDate, 'PPP')}.` : "You haven't won any bids yet. Keep playing!"}
                                </p>
                            </div>
                        )}
                        {renderPagination()}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
