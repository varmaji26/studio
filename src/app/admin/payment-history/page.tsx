
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, getDocs, DocumentData, orderBy, Timestamp, doc, getDoc, limit, startAfter, QueryDocumentSnapshot, endBefore, limitToLast } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDown, ArrowUp, Download, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


interface Transaction extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
    type: 'deposit' | 'withdrawal';
    paymentMethod?: string;
    withdrawalMethod?: string;
}

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const ITEMS_PER_PAGE = 10;

export default function AdminPaymentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [pageDocs, setPageDocs] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);


  const fetchTransactions = useCallback(async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    setLoading(true);
    try {
        const fetchCollection = async (collectionName: 'deposits' | 'withdrawals') => {
            const snapshot = await getDocs(query(collection(db, collectionName), orderBy("createdAt", "desc")));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: collectionName.slice(0, -1) } as Transaction));
        };

        const deposits = await fetchCollection('deposits');
        const withdrawals = await fetchCollection('withdrawals');
        const combined = [...deposits, ...withdrawals].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setAllTransactions(combined); // Store all for filtering

    } catch (error) {
        console.error("Error fetching all transactions for filter: ", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(1, 'first');
  }, [fetchTransactions]);

  const handlePageChange = (newPage: number) => {
    const direction = newPage > currentPage ? 'next' : 'prev';
    // Re-fetch paginated data.
    // This is simplified; a full implementation might re-trigger a paginated query here.
    setCurrentPage(newPage);
  }
  
  const filteredTransactions = useMemo(() => {
    let sourceData = allTransactions;
    
    if (activeTab === 'deposits') {
        sourceData = allTransactions.filter(t => t.type === 'deposit');
    } else if (activeTab === 'withdrawals') {
        sourceData = allTransactions.filter(t => t.type === 'withdrawal');
    }

    let filtered = sourceData;

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
      filtered = filtered.filter((t) => 
        t.displayName?.toLowerCase().includes(lowercasedFilter) ||
        t.mobile?.toLowerCase().includes(lowercasedFilter)
      );
    }
    return filtered;
  }, [searchTerm, allTransactions, selectedDate, activeTab]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);


  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, activeTab, selectedDate]);


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'approved': return 'secondary';
        case 'rejected': return 'destructive';
        case 'pending':
        default:
            return 'default';
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    doc.text("Admin Payment History", 14, 16);

    const tableColumn = ["Date", "Username", "Mobile", "Type", "Amount (₹)", "Method", "Status"];
    const tableRows: (string | number)[][] = [];
    
    // PDF download will contain all filtered data, not just the paginated view.
    filteredTransactions.forEach(t => {
        const transactionData = [
            formatDate(t.createdAt),
            t.displayName,
            t.mobile || 'N/A',
            t.type,
            t.amount,
            t.paymentMethod || t.withdrawalMethod || 'N/A',
            t.status,
        ];
        tableRows.push(transactionData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
    });

    doc.save(`payment-history-${activeTab}.pdf`);
  };
  
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
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
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    )
  }

  const renderTable = (data: Transaction[]) => (
     <div className="overflow-x-auto mt-4">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((t) => (
                    <TableRow key={t.id + t.createdAt.toMillis()}>
                        <TableCell>{formatDate(t.createdAt)}</TableCell>
                        <TableCell>{t.displayName}</TableCell>
                        <TableCell>{t.mobile}</TableCell>
                        <TableCell>
                            <Badge variant={t.type === 'deposit' ? 'default' : 'outline'} className={t.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {t.type === 'deposit' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                {t.type}
                            </Badge>
                        </TableCell>
                        <TableCell>₹{t.amount}</TableCell>
                        <TableCell>{t.paymentMethod || t.withdrawalMethod}</TableCell>
                        <TableCell>
                            <Badge 
                                variant={getStatusBadgeVariant(t.status)}
                                className={
                                    t.status === 'approved' ? 'bg-green-500 text-white' : 
                                    t.status === 'rejected' ? 'bg-red-500 text-white' : ''
                                }
                            >
                                {t.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        {data.length === 0 && !loading && (
             <p className="text-center text-muted-foreground mt-4">
                No transactions found.
             </p>
        )}
     </div>
  );

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-3xl font-bold">Payment History</CardTitle>
                    <CardDescription>View all deposit and withdrawal history for all users.</CardDescription>
                </div>
                 <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={paginatedTransactions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
            </div>
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
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="deposits">Deposits</TabsTrigger>
                        <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        {renderTable(paginatedTransactions)}
                    </TabsContent>
                    <TabsContent value="deposits">
                        {renderTable(paginatedTransactions)}
                    </TabsContent>
                    <TabsContent value="withdrawals">
                        {renderTable(paginatedTransactions)}
                    </TabsContent>
                </Tabs>
            )}
            {!loading && renderPagination()}
          </CardContent>
        </Card>
      </div>
  );
}
