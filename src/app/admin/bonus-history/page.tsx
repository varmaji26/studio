
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, getDocs, DocumentData, orderBy, Timestamp, doc, getDoc, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, Gift, Calendar as CalendarIcon, ArrowDown, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BonusTransaction extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    type: 'Given' | 'Used' | 'Reset';
    description: string;
    createdAt: Timestamp;
}

const ITEMS_PER_PAGE = 10;

export default function AdminBonusHistoryPage() {
  const [transactions, setTransactions] = useState<BonusTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<BonusTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDocs, setPageDocs] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

   const fetchTransactions = useCallback(async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    setLoading(true);
    try {
        let q = query(collection(db, "bonusTransactions"), orderBy("createdAt", "desc"));
        
        if (direction === 'next' && pageDocs[page - 1]) {
            q = query(q, startAfter(pageDocs[page - 1]), limit(ITEMS_PER_PAGE));
        } else {
            q = query(q, limit(ITEMS_PER_PAGE));
        }

        const querySnapshot = await getDocs(q);
        const transactionsData = querySnapshot.docs.map(transDoc => ({ id: transDoc.id, ...transDoc.data() } as BonusTransaction));
        setTransactions(transactionsData);
        
        const newPageDocs = [...pageDocs.slice(0, page)];
        newPageDocs[page] = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        setPageDocs(newPageDocs);

    } catch (error) {
        console.error("Error fetching bonus transactions: ", error);
    } finally {
        setLoading(false);
    }
  }, [pageDocs]);

  useEffect(() => {
    fetchTransactions(1, 'first');
    // Fetch all for filtering
    const fetchAllForFilter = async () => {
        const allQuery = query(collection(db, "bonusTransactions"), orderBy("createdAt", "desc"));
        const allSnapshot = await getDocs(allQuery);
        setAllTransactions(allSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BonusTransaction)));
    };
    fetchAllForFilter();
  }, []);
  
  const handlePageChange = (newPage: number) => {
    const direction = newPage > currentPage ? 'next' : 'prev';
    fetchTransactions(newPage, direction);
    setCurrentPage(newPage);
  }

  const filteredTransactions = useMemo(() => {
    let source = searchTerm || selectedDate ? allTransactions : transactions;
    let filtered = source;

    if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(t => {
            if (!t.createdAt?.seconds) return false;
            const tDate = new Date(t.createdAt.seconds * 1000);
            return tDate >= startOfDay && tDate <= endOfDay;
        });
    }

    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (lowercasedFilter) {
      filtered = filtered.filter((t) => {
        return (
          t.displayName?.toLowerCase().includes(lowercasedFilter) ||
          t.mobile?.includes(lowercasedFilter)
        );
      });
    }
    
    return filtered;
  }, [searchTerm, transactions, allTransactions, selectedDate]);
  
  const displayTransactions = searchTerm || selectedDate ? filteredTransactions : transactions;


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
        case 'Given': return 'secondary';
        case 'Reset': return 'destructive';
        case 'Used':
        default:
            return 'default';
    }
  };

  const renderPagination = () => {
    if(searchTerm || selectedDate) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>Page <strong>{currentPage}</strong></div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pageDocs[currentPage] || displayTransactions.length < ITEMS_PER_PAGE}
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
            <CardTitle className="text-3xl font-bold flex items-center gap-2"><Gift />Bonus History</CardTitle>
            <CardDescription>Track all bonus transactions given, used, or reset for all users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold">All Transactions</h3>
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
                            placeholder="Search by username or mobile..."
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
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayTransactions.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{formatDate(t.createdAt)}</TableCell>
                                    <TableCell>{t.displayName}</TableCell>
                                    <TableCell>{t.mobile}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={getTypeBadgeVariant(t.type)}
                                            className={cn(
                                                'flex items-center gap-1 w-fit',
                                                t.type === 'Given' && 'bg-green-500/80 text-white',
                                                t.type === 'Reset' && 'bg-red-500/80 text-white',
                                                t.type === 'Used' && 'bg-blue-500/80 text-white'
                                            )}
                                        >
                                            {t.type === 'Given' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                            {t.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            'font-bold',
                                            t.type === 'Given' ? 'text-green-400' : 'text-red-400'
                                        )}
                                    >
                                        ₹{t.amount}
                                    </TableCell>
                                    <TableCell>{t.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 {renderPagination()}
                </>
            )}
            {displayTransactions.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm || selectedDate ? `No bonus transactions found for the selected criteria.` : "No bonus transactions found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

