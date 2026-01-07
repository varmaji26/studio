'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, DocumentData, orderBy, Timestamp, onSnapshot, writeBatch, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar as CalendarIcon, Download, XCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { runTransaction, doc, increment } from 'firebase/firestore';


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
    status: 'running' | 'won' | 'lost' | 'cancelled';
    createdAt: Timestamp;
}

// Extend jsPDF with autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const ITEMS_PER_PAGE = 10;

export default function AdminBidHistoryPage() {
  const [allBids, setAllBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (searchParams.get('viewed') === 'true') {
        localStorage.setItem('lastViewedBidsTimestamp', Date.now().toString());
    }
  }, [searchParams]);
  
  const fetchBids = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const bidsData = querySnapshot.docs.map(bidDoc => ({ id: bidDoc.id, ...bidDoc.data() } as Bid));
        setAllBids(bidsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching bids: ", error);
        setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchBids();
    return () => unsubscribe();
  }, [fetchBids]);

  const filteredBids = useMemo(() => {
    let filtered = allBids;
    
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
  }, [searchTerm, allBids, selectedDate]);
  
  const totalBiddingAmount = useMemo(() => {
    return filteredBids.reduce((acc, bid) => acc + (bid.totalAmount || 0), 0);
  }, [filteredBids]);

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
  
  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const reportDate = selectedDate ? format(selectedDate, "PPP") : 'All Time';
    doc.text(`Bid History Report - ${reportDate}`, 14, 16);
    
    // Use the already client-side filtered bids for the PDF
    const bidsForPdf = filteredBids;

    const tableColumn = ["Date", "Username", "Mobile", "Game", "Bet Details", "Amount (₹)", "Status"];
    const tableRows: (string | number)[][] = [];

    bidsForPdf.forEach(bid => {
        const bidRow = [
            formatDate(bid.createdAt),
            bid.displayName,
            bid.mobile || 'N/A',
            `${bid.gameName} (${bid.session})`,
            `${bid.betType} - ${bid.numbers.join(', ')}`,
            bid.totalAmount.toFixed(2),
            bid.status
        ];
        tableRows.push(bidRow);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 24,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`bid-history-report-${selectedDate ? format(selectedDate, "yyyy-MM-dd") : 'all-time'}.pdf`);
  };
  
  const handleCancelBid = async (bid: Bid) => {
    const bidDocRef = doc(db, 'bids', bid.id);
    const userDocRef = doc(db, 'users', bid.userId);

    try {
        await runTransaction(db, async (transaction) => {
            const bidDoc = await transaction.get(bidDocRef);
            if (!bidDoc.exists() || bidDoc.data().status !== 'running') {
                throw new Error("This bid is no longer running and cannot be cancelled.");
            }
            transaction.update(userDocRef, { balance: increment(bid.totalAmount) });
            transaction.update(bidDocRef, { status: 'cancelled' });
        });
        toast({
            title: 'Success!',
            description: `Bid #${bid.id} has been cancelled and ₹${bid.totalAmount} refunded to ${bid.displayName}.`
        });
    } catch (error: any) {
        console.error('Error cancelling bid:', error);
        toast({
            variant: 'destructive',
            title: 'Error Cancelling Bid',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  };

  const handleCleanOldBids = async () => {
      setIsCleaning(true);
      try {
          const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));
          
          let totalDeleted = 0;
          let hasMore = true;

          while (hasMore) {
              const oldBidsQuery = query(collection(db, 'bids'), where('createdAt', '<', thirtyDaysAgo), limit(500));
              const querySnapshot = await getDocs(oldBidsQuery);
              
              if (querySnapshot.empty) {
                  hasMore = false;
                  break;
              }

              const batch = writeBatch(db);
              querySnapshot.forEach(doc => {
                  batch.delete(doc.ref);
              });

              await batch.commit();
              totalDeleted += querySnapshot.size;
              
              if (querySnapshot.size < 500) {
                  hasMore = false;
              } else {
                   toast({
                      title: 'Cleaning in progress...',
                      description: `${totalDeleted} bids deleted so far. Deleting more in batches.`
                  });
              }
          }

          if (totalDeleted === 0) {
              toast({ title: 'No old bids to clean.', description: 'There are no bids older than 30 days.' });
          } else {
              toast({
                  title: 'Success!',
                  description: `Cleanup complete. A total of ${totalDeleted} old bids have been successfully deleted.`
              });
          }

      } catch (error: any) {
          console.error('Error cleaning old bids:', error);
          toast({
              variant: 'destructive',
              title: 'Cleanup Failed',
              description: 'Could not delete old bids. Please check the console and try again.'
          });
      } finally {
          setIsCleaning(false);
      }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'won': return 'secondary';
        case 'lost': return 'destructive';
        case 'cancelled': return 'outline';
        case 'running':
        default:
            return 'default';
    }
  };

  const renderPagination = () => {
    if(totalPages <= 1) return null;

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold">Bid History</CardTitle>
                <CardDescription>View all bids placed by users across all games.</CardDescription>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isCleaning}>
                        {isCleaning ? <Loader className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Clean Old Bids
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will permanently delete all bids older than 30 days. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCleanOldBids}>Confirm & Clean</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold">All Bids</h3>
                 <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[180px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd MMM, yyyy") : <span>Pick a date</span>}
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

            <Card className="bg-primary/10 border-primary/20 mb-4">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold">Total Bidding Amount</p>
                        <p className="text-2xl font-bold text-primary">
                            ₹{totalBiddingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </CardContent>
            </Card>

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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBids.length > 0 ? (
                                paginatedBids.map((bid) => (
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
                                            className={cn(
                                                bid.status === 'won' && 'bg-green-500 text-white',
                                                bid.status === 'cancelled' && 'border-yellow-500 text-yellow-500',
                                            )}
                                        >
                                            {bid.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {bid.status === 'running' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm">
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Cancel
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure you want to cancel this bid?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will cancel the bid and refund ₹{bid.totalAmount} to ${bid.displayName}'s wallet.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Close</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCancelBid(bid)}>Confirm Cancel</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                           ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                      {searchTerm || selectedDate ? "No bids found for the selected criteria." : "No bids found."}
                                    </TableCell>
                                </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </div>
                 {renderPagination()}
                </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
