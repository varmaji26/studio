
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, getDocs, DocumentData, orderBy, Timestamp, where, getDoc, doc, limit, startAfter, QueryDocumentSnapshot, endBefore, limitToLast } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Search, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


interface Win extends DocumentData {
    id: string;
    displayName: string;
    mobile?: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    winningAmount: number;
    createdAt: Timestamp;
}

const ITEMS_PER_PAGE = 10;

export default function AdminWinHistoryPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [allWins, setAllWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('viewed') === 'true') {
        localStorage.setItem('lastViewedWinsTimestamp', Date.now().toString());
    }
  }, [searchParams]);


   const fetchWins = useCallback(async () => {
    setLoading(true);
    try {
        const baseQuery = query(
            collection(db, "bids"), 
            where("status", "==", "won")
        );
        
        const querySnapshot = await getDocs(baseQuery);
        const winsData = querySnapshot.docs.map(bidDoc => ({ id: bidDoc.id, ...bidDoc.data() } as Win));
        
        // Sort client-side
        winsData.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        setWins(winsData);
        setAllWins(winsData);

    } catch (error) {
        console.error("Error fetching wins: ", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWins();
  }, [fetchWins]);
  
  const filteredWins = useMemo(() => {
    let source = allWins;
    let filtered = source;

    if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(win => {
            if (!win.createdAt?.seconds) return false;
            const winDate = new Date(win.createdAt.seconds * 1000);
            return winDate >= startOfDay && winDate <= endOfDay;
        });
    }

    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (lowercasedFilter) {
      filtered = filtered.filter((win) => {
        return (
          win.displayName?.toLowerCase().includes(lowercasedFilter) ||
          win.gameName?.toLowerCase().includes(lowercasedFilter) ||
          win.mobile?.includes(lowercasedFilter)
        );
      });
    }

    return filtered;
  }, [searchTerm, allWins, selectedDate]);
  
  const totalPages = Math.ceil(filteredWins.length / ITEMS_PER_PAGE);
  const paginatedWins = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWins.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredWins, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedDate]);


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
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

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="text-amber-400" />
                Win History
            </CardTitle>
            <CardDescription>View all winning bids and payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold">All Wins</h3>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[280px] justify-start text-left font-normal",
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
                    <div className="relative w-full sm:w-auto sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by username, game, or mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-input h-10 rounded-lg pl-10"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Mobile</TableHead>
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
                                    <TableCell>{win.displayName}</TableCell>
                                    <TableCell>{win.mobile}</TableCell>
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
                 {renderPagination()}
                </>
            )}
            {paginatedWins.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm || selectedDate ? `No wins found for the selected criteria.` : "No wins found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
