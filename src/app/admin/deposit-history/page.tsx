'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, DocumentData, orderBy, Timestamp, onSnapshot, getDocs, runTransaction, doc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDown, ArrowUp, Download, Calendar as CalendarIcon, ArrowUpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Transaction extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'reverted';
    createdAt: Timestamp;
    paymentMethod?: string;
}

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const ITEMS_PER_PAGE = 10;

export default function AdminDepositHistoryPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const { toast } = useToast();
  
  const fetchTransactions = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
        setAllTransactions(data);
        setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchTransactions();
    return () => unsubscribe();
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    if (fromDate && toDate) {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(toDate);
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
  }, [searchTerm, allTransactions, fromDate, toDate]);

  const { totalDeposits } = useMemo(() => {
    return filteredTransactions.reduce(
      (totals, transaction) => {
        if (transaction.status === 'approved') {
          totals.totalDeposits += transaction.amount;
        }
        return totals;
      },
      { totalDeposits: 0 }
    );
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'approved': return 'secondary';
        case 'rejected': return 'destructive';
        case 'reverted': return 'outline';
        case 'pending':
        default:
            return 'default';
    }
  };

  const handleRevertDeposit = async (transaction: Transaction) => {
    const depositDocRef = doc(db, 'deposits', transaction.id);
    const userDocRef = doc(db, 'users', transaction.userId);

    try {
        await runTransaction(db, async (tx) => {
            const depositDoc = await tx.get(depositDocRef);
            if (!depositDoc.exists() || depositDoc.data().status !== 'approved') {
                throw new Error("This deposit is no longer approved and cannot be reverted.");
            }
            // Revert amount from user's balance
            tx.update(userDocRef, { balance: increment(-transaction.amount) });
            // Update deposit status to move it back to pending queue
            tx.update(depositDocRef, { status: 'pending' });
        });
        toast({
            title: 'Success!',
            description: `Deposit #${transaction.id} has been reverted to pending. ₹${transaction.amount} deducted from ${transaction.displayName}.`
        });
    } catch (error: any) {
        console.error('Error reverting deposit:', error);
        toast({
            variant: 'destructive',
            title: 'Error Reverting Deposit',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    doc.text("Admin Deposit History", 14, 16);
    
    // Fetch all for PDF
    const allQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(allQuery);
    const allTransactions = snapshot.docs.map(d => d.data() as Transaction);

    const tableColumn = ["Date", "Username", "Mobile", "Amount (INR)", "Method", "Status"];
    const tableRows: (string | number)[][] = [];
    
    allTransactions.forEach(t => {
        const transactionData = [
            formatDate(t.createdAt),
            t.displayName,
            t.mobile || 'N/A',
            t.amount,
            t.paymentMethod || 'N/A',
            t.status,
        ];
        tableRows.push(transactionData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
    });

    doc.save(`deposit-history.pdf`);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next</Button>
            </div>
        </div>
    );
  };

  return (
     <div className="flex-1 space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold">Deposit History</h1>
                <p className="text-muted-foreground">View all deposit history for all users.</p>
            </div>
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={allTransactions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
            </Button>
        </div>
        <div>
           <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                  <ArrowUpCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-green-500">₹{totalDeposits.toLocaleString('en-IN')}</div>
                  <p className="text-xs text-muted-foreground">Based on selected filters (approved only)</p>
              </CardContent>
          </Card>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h3 className="text-xl font-semibold">All Transactions</h3>
              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                      <Label htmlFor="from-date" className="text-sm shrink-0">From</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button id="from-date" variant={"outline"} className={cn("w-full sm:w-[180px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {fromDate ? format(fromDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
                      </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                      <Label htmlFor="to-date" className="text-sm shrink-0">To</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button id="to-date" variant={"outline"} className={cn("w-full sm:w-[180px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {toDate ? format(toDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
                      </Popover>
                  </div>
                  <div className="relative w-full sm:w-auto sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="Search by username or mobile..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-input h-10 rounded-lg pl-10" />
                  </div>
              </div>
          </div>
          {loading ? (
              <div className="flex justify-center items-center h-48"><Loader className="h-8 w-8 text-primary" /></div>
          ) : (
              <div className="overflow-x-auto mt-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Username</TableHead>
                              <TableHead>Mobile</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {paginatedTransactions.map((t) => (
                              <TableRow key={t.id}>
                                  <TableCell>{formatDate(t.createdAt)}</TableCell>
                                  <TableCell>{t.displayName}</TableCell>
                                  <TableCell>{t.mobile}</TableCell>
                                  <TableCell>₹{t.amount}</TableCell>
                                  <TableCell>{t.paymentMethod}</TableCell>
                                  <TableCell>
                                    <Badge 
                                        variant={getStatusBadgeVariant(t.status)} 
                                        className={cn(
                                            t.status === 'approved' && 'bg-green-500 text-white', 
                                            t.status === 'rejected' && 'bg-red-500 text-white',
                                            t.status === 'reverted' && 'border-yellow-500 text-yellow-500'
                                        )}
                                      >
                                        {t.status}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {t.status === 'approved' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">Revert</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will revert the approved deposit, deduct ₹{t.amount} from {t.displayName}'s wallet, and move it back to the pending requests queue. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Close</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRevertDeposit(t)}>Confirm Revert</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                  {paginatedTransactions.length === 0 && !loading && (<p className="text-center text-muted-foreground mt-4">No transactions found.</p>)}
                  {renderPagination()}
              </div>
          )}
        </div>
      </div>
  );
}
