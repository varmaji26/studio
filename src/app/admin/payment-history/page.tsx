
'use client';

import { useState, useEffect, useCallback } from 'react';
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

const PAGE_SIZE = 7;

export default function AdminPaymentHistoryPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUserDetails = async (requests: DocumentData[]): Promise<Transaction[]> => {
    const requestsWithUsers = await Promise.all(
        requests.map(async (request) => {
            const userDocRef = doc(db, 'users', request.userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : {};
            return {
                ...request,
                mobile: userData.mobile || 'N/A',
            } as Transaction;
        })
    );
    return requestsWithUsers;
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
        setDisplayedTransactions(combined.slice(0, PAGE_SIZE));
        setPage(1);
        setHasMore(combined.length > PAGE_SIZE);
        
    } catch (error) {
        console.error("Error fetching transactions: ", error);
    } finally {
        setLoading(false);
    }
  }, []);


   useEffect(() => {
    fetchAllTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredTransactions(displayedTransactions);
        setHasMore(allTransactions.length > displayedTransactions.length);
        return;
    }
    const filteredData = allTransactions.filter((t) => 
      t.displayName?.toLowerCase().includes(lowercasedFilter) ||
      t.mobile?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredTransactions(filteredData);
    setHasMore(false); // Disable load more when searching
  }, [searchTerm, displayedTransactions, allTransactions]);

  const loadMore = () => {
      const nextPage = page + 1;
      const newTransactions = allTransactions.slice(0, nextPage * PAGE_SIZE);
      setDisplayedTransactions(newTransactions);
      setPage(nextPage);
      setHasMore(allTransactions.length > newTransactions.length);
  };


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
    
    let transactionsToExport = allTransactions;

    if(searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        transactionsToExport = allTransactions.filter((t) => 
            t.displayName?.toLowerCase().includes(lowercasedFilter) ||
            t.mobile?.toLowerCase().includes(lowercasedFilter)
        );
    }

    transactionsToExport.forEach(t => {
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

    doc.save('admin-payment-history.pdf');
  };
  
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

  const dataForTabs = searchTerm ? filteredTransactions : allTransactions;

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-3xl font-bold">Payment History</CardTitle>
                    <CardDescription>View all deposit and withdrawal history for all users.</CardDescription>
                </div>
                 <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={allTransactions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Transactions ({searchTerm ? filteredTransactions.length : allTransactions.length})</h3>
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
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="deposits">Deposits</TabsTrigger>
                        <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        {renderTable(filteredTransactions)}
                    </TabsContent>
                    <TabsContent value="deposits">
                        {renderTable(filteredTransactions.filter(t => t.type === 'deposit'))}
                    </TabsContent>
                    <TabsContent value="withdrawals">
                        {renderTable(filteredTransactions.filter(t => t.type === 'withdrawal'))}
                    </TabsContent>
                </Tabs>
            )}
            
            {hasMore && !searchTerm && !loading && (
                <div className="text-center mt-6">
                    <Button onClick={loadMore}>
                        Load More
                    </Button>
                </div>
            )}
            
          </CardContent>
        </Card>
      </div>
  );
}
