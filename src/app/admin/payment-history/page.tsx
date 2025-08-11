
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, getDocs, DocumentData, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDown, ArrowUp, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  const fetchUserDetails = async (requests: DocumentData[]): Promise<Transaction[]> => {
    return Promise.all(
        requests.map(async (request) => {
            if (!request.userId) return { ...request, mobile: 'N/A' } as Transaction;
            const userDocRef = doc(db, 'users', request.userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : {};
            return {
                ...request,
                mobile: userData.mobile || 'N/A',
            } as Transaction;
        })
    );
  };

  const fetchAllTransactions = useCallback(async () => {
    setLoading(true);
    try {
        const depositsQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
        const withdrawalsQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));

        const [depositsSnapshot, withdrawalsSnapshot] = await Promise.all([
            getDocs(depositsQuery),
            getDocs(withdrawalsQuery)
        ]);

        const depositsData = depositsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const withdrawalsData = withdrawalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const depositsWithUsers = await fetchUserDetails(depositsData);
        const withdrawalsWithUsers = await fetchUserDetails(withdrawalsData);

        const deposits = depositsWithUsers.map(t => ({...t, type: 'deposit'})) as Transaction[];
        const withdrawals = withdrawalsWithUsers.map(t => ({...t, type: 'withdrawal'})) as Transaction[];

        const combined = [...deposits, ...withdrawals].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setAllTransactions(combined);
        
    } catch (error) {
        console.error("Error fetching transactions: ", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTransactions();
  }, [fetchAllTransactions]);
  
  const filteredTransactions = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        return allTransactions;
    }
    return allTransactions.filter((t) => 
      t.displayName?.toLowerCase().includes(lowercasedFilter) ||
      t.mobile?.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, allTransactions]);

  const transactionsForTab = useMemo(() => {
      if (activeTab === 'deposits') {
          return filteredTransactions.filter(t => t.type === 'deposit');
      }
      if (activeTab === 'withdrawals') {
          return filteredTransactions.filter(t => t.type === 'withdrawal');
      }
      return filteredTransactions;
  }, [filteredTransactions, activeTab]);

  const totalPages = Math.ceil(transactionsForTab.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return transactionsForTab.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [transactionsForTab, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, activeTab]);


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

    const tableColumn = ["Date", "Username", "Mobile", "Type", "Amount", "Method", "Status"];
    const tableRows: (string | number)[][] = [];
    
    transactionsForTab.forEach(t => {
        const transactionData = [
            formatDate(t.createdAt),
            t.displayName,
            t.mobile || 'N/A',
            t.type,
            `₹${t.amount}`,
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
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>
                Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, transactionsForTab.length)}</strong> of <strong>{transactionsForTab.length}</strong> entries
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
                 <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={transactionsForTab.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Transactions ({transactionsForTab.length})</h3>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by username or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-input h-10 rounded-lg pl-10"
                    />
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
