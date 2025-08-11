
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, getDocs, DocumentData, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


interface Bid extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    status: 'running' | 'won' | 'lost';
    createdAt: Timestamp;
}

const ITEMS_PER_PAGE = 10;

export default function AdminBidHistoryPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();


   const fetchBids = useCallback(async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const bidsDataPromises = querySnapshot.docs.map(async (bidDoc) => {
            const bidData = bidDoc.data();
            let mobile = 'N/A';
            if (bidData.userId) {
                const userDocRef = doc(db, 'users', bidData.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    mobile = userDoc.data().mobile || 'N/A';
                }
            }
            return { id: bidDoc.id, ...bidData, mobile } as Bid;
        });

        const bidsData = await Promise.all(bidsDataPromises);
        setBids(bidsData);

    } catch (error) {
        console.error("Error fetching bids: ", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);
  
  const filteredBids = useMemo(() => {
    let filtered = bids;

    // Filter by date
    if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(bid => {
            if (!bid.createdAt?.seconds) return false;
            const bidDate = new Date(bid.createdAt.seconds * 1000);
            return bidDate >= startOfDay && bidDate <= endOfDay;
        });
    }

    // Filter by search term
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (lowercasedFilter) {
      filtered = filtered.filter((bid) => {
        return (
          bid.displayName?.toLowerCase().includes(lowercasedFilter) ||
          bid.gameName?.toLowerCase().includes(lowercasedFilter) ||
          bid.mobile?.includes(lowercasedFilter)
        );
      });
    }
    
    return filtered;
  }, [searchTerm, bids, selectedDate]);


  const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
  const paginatedBids = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredBids.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBids, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedDate]);


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'won': return 'secondary';
        case 'lost': return 'destructive';
        case 'running':
        default:
            return 'default';
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>
                Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredBids.length)}</strong> of <strong>{filteredBids.length}</strong> entries
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

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Bid History</CardTitle>
            <CardDescription>View all bids placed by users across all games.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold">All Bids ({filteredBids.length})</h3>
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
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBids.map((bid) => (
                                <TableRow key={bid.id}>
                                    <TableCell>{formatDate(bid.createdAt)}</TableCell>
                                    <TableCell>{bid.displayName}</TableCell>
                                    <TableCell>{bid.mobile}</TableCell>
                                    <TableCell>{bid.gameName} ({bid.session})</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{bid.betType}</span>
                                            <span className="text-xs text-muted-foreground">{bid.numbers.join(', ')}</span>
                                        </div>
                                    </TableCell>
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
                 {renderPagination()}
                </>
            )}
            {paginatedBids.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm || selectedDate ? `No bids found for the selected criteria.` : "No bids found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
