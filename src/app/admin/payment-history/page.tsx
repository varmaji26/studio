
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDown, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Transaction extends DocumentData {
    id: string;
    displayName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
    type: 'deposit' | 'withdrawal';
    paymentMethod?: string;
    withdrawalMethod?: string;
}

export default function AdminPaymentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

   useEffect(() => {
    setLoading(true);

    const depositQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const depositsUnsub = onSnapshot(depositQuery, (snapshot) => {
        const deposits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'deposit' })) as Transaction[];
        setTransactions(prev => {
            const withdrawals = prev.filter(t => t.type === 'withdrawal');
            const all = [...deposits, ...withdrawals].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            return all;
        });
        setLoading(false);
    });

    const withdrawalQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const withdrawalsUnsub = onSnapshot(withdrawalQuery, (snapshot) => {
        const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'withdrawal' })) as Transaction[];
        setTransactions(prev => {
            const deposits = prev.filter(t => t.type === 'deposit');
            const all = [...deposits, ...withdrawals].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            return all;
        });
        setLoading(false);
    });

    return () => {
        depositsUnsub();
        withdrawalsUnsub();
    };
  }, []);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredTransactions(transactions);
        return;
    }
    const filteredData = transactions.filter((t) => 
      t.displayName?.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredTransactions(filteredData);
  }, [searchTerm, transactions]);


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
  
  const renderTable = (data: Transaction[]) => (
     <div className="overflow-x-auto mt-4">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((t) => (
                    <TableRow key={t.id}>
                        <TableCell>{formatDate(t.createdAt)}</TableCell>
                        <TableCell>{t.displayName}</TableCell>
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
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Payment History</CardTitle>
            <CardDescription>View all deposit and withdrawal history for all users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Transactions ({filteredTransactions.length})</h3>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by username..."
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
            
          </CardContent>
        </Card>
      </div>
  );
}
