
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, DocumentData, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface Bid extends DocumentData {
    id: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    winningAmount?: number;
    status: 'running' | 'won' | 'lost' | 'cancelled';
    createdAt: Timestamp;
}

const ITEMS_PER_PAGE = 10;

export default function MyBetsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'won' | 'lost' | 'cancelled'>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user?.uid) {
             if (!authLoading) setLoadingData(false);
             return;
        }

        setLoadingData(true);
        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid));
            setBids(bidsData);
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching bids: ", error);
            setLoadingData(false);
        });

        return () => unsubscribeBids();
    }, [user?.uid, authLoading]);

    const filteredBids = useMemo(() => {
        let dateFiltered = bids;
        if (fromDate) {
            const startOfDay = new Date(fromDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = toDate ? new Date(toDate) : new Date(fromDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            dateFiltered = bids.filter(bid => {
                if (!bid.createdAt?.seconds) return false;
                const bidDate = new Date(bid.createdAt.seconds * 1000);
                return bidDate >= startOfDay && bidDate <= endOfDay;
            });
        }
        if (statusFilter === 'all') {
            return dateFiltered;
        }
        return dateFiltered.filter(bid => bid.status === statusFilter);
    }, [bids, fromDate, toDate, statusFilter]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, statusFilter]);
    
    const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
    const paginatedBids = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBids.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredBids, currentPage]);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'won': return 'secondary';
            case 'lost': return 'destructive';
            case 'cancelled': return 'outline';
            case 'running': default: return 'default';
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
                <div>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
            </div>
        );
    };

    if (authLoading || loadingData) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground">
            <header className="bg-card/80 p-4 sticky top-0 z-10 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">My Bids</h1>
                </div>
            </header>
            <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle>Bids History</CardTitle>
                        <CardDescription>View all your past and current bids here.</CardDescription>
                        <div className="pt-4">
                            <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="from-date" className="text-sm shrink-0">From</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="from-date" variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fromDate ? format(fromDate, "dd/MM/yy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="to-date" className="text-sm shrink-0">To</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="to-date" variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {toDate ? format(toDate, "dd/MM/yy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="running">Running</TabsTrigger>
                                <TabsTrigger value="won">Won</TabsTrigger>
                                <TabsTrigger value="lost">Lost</TabsTrigger>
                                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="overflow-x-auto mt-4">
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
                                    {paginatedBids.length > 0 ? (
                                        paginatedBids.map((bid) => (
                                            <TableRow key={bid.id}>
                                                <TableCell className="text-xs">{formatDate(bid.createdAt)}</TableCell>
                                                <TableCell>{bid.gameName} ({bid.session})</TableCell>
                                                <TableCell>{bid.betType}</TableCell>
                                                <TableCell>{bid.numbers.join(', ')}</TableCell>
                                                <TableCell>₹{bid.totalAmount}</TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        variant={getStatusBadgeVariant(bid.status)}
                                                        className={cn(bid.status === 'won' && 'bg-green-500 text-white', bid.status === 'cancelled' && 'border-yellow-500 text-yellow-500')}
                                                    >
                                                        {bid.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                You haven't placed any bids yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {renderPagination()}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
