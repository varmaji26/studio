
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, runTransaction, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, CircleDollarSign } from 'lucide-react';

interface Request extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    paymentMethod?: string;
    transactionId?: string;
    withdrawalMethod?: string;
    withdrawalDetails?: string;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Firebase Timestamps can be either objects with seconds/nanoseconds, or Date objects after retrieval.
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
};


export default function DepositsAndWithdrawalsPage() {
  const [depositRequests, setDepositRequests] = useState<Request[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const fetchUserDetails = async (requests: DocumentData[]): Promise<Request[]> => {
      return Promise.all(
        requests.map(async (request) => {
          const userDocRef = doc(db, 'users', request.userId);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : {};
          return {
            ...request,
            mobile: userData.mobile || 'N/A',
          } as Request;
        })
      );
    };

    const depositsQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(depositsQuery, async (snapshot) => {
      const depositsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const depositsWithUsers = await fetchUserDetails(depositsData);
      setDepositRequests(depositsWithUsers);
    });

    const withdrawalsQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubWithdrawals = onSnapshot(withdrawalsQuery, async (snapshot) => {
      const withdrawalsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const withdrawalsWithUsers = await fetchUserDetails(withdrawalsData);
      setWithdrawalRequests(withdrawalsWithUsers);
      if(loading){
        setLoading(false);
      }
    });

    return () => {
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [loading]);

  const handleDepositRequest = async (request: Request, status: 'approved' | 'rejected') => {
    const requestDocRef = doc(db, 'deposits', request.id);
    const userDocRef = doc(db, 'users', request.userId);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');

    try {
      await runTransaction(db, async (transaction) => {
        const requestDoc = await transaction.get(requestDocRef);
        if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
          throw new Error("This request has already been processed.");
        }

        if (status === 'approved') {
          transaction.update(userDocRef, { balance: increment(request.amount) });
          transaction.update(statsDocRef, { totalBalance: increment(request.amount) });
        }
        
        transaction.update(requestDocRef, { status: status });
      });
      toast({ title: 'Success!', description: `Request has been ${status}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update request.' });
    }
  };

  const handleWithdrawalRequest = async (request: Request, status: 'approved' | 'rejected') => {
    const requestDocRef = doc(db, 'withdrawals', request.id);
    const userDocRef = doc(db, 'users', request.userId);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    
    try {
        await runTransaction(db, async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
                throw new Error("This request has already been processed.");
            }
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error(`User not found!`);

            const currentBalance = userDoc.data().balance || 0;
            if (status === 'approved') {
                if (currentBalance < request.amount) {
                     transaction.update(requestDocRef, { status: 'rejected' });
                     throw new Error("Insufficient balance. Request rejected.");
                }
                transaction.update(userDocRef, { balance: increment(-request.amount) });
                transaction.update(statsDocRef, { totalBalance: increment(-request.amount) });
            }
            
            transaction.update(requestDocRef, { status: status });
        });
        toast({ title: 'Success!', description: `Withdrawal request has been ${status}.` });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process withdrawal.' });
    }
  };

  const pendingDeposits = depositRequests.filter(r => r.status === 'pending');
  const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'pending');

  const filteredData = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
      return { deposits: pendingDeposits, withdrawals: pendingWithdrawals };
    }
    const filterFn = (req: Request) => req.displayName?.toLowerCase().includes(lowercasedFilter) || req.mobile?.includes(lowercasedFilter);
    return {
      deposits: pendingDeposits.filter(filterFn),
      withdrawals: pendingWithdrawals.filter(filterFn),
    };
  }, [searchTerm, pendingDeposits, pendingWithdrawals]);

  const paginatedWithdrawals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.withdrawals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData.withdrawals, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.withdrawals.length / itemsPerPage);

  const renderWithdrawalsTable = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span>Show</span>
                 <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
                 <span>entries</span>
            </div>
            <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-auto"
                />
            </div>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>SL</TableHead>
                        <TableHead>NAME</TableHead>
                        <TableHead>PHONE NO</TableHead>
                        <TableHead>AMOUNT</TableHead>
                        <TableHead>DATE</TableHead>
                        <TableHead>PAYMENT METHOD</TableHead>
                        <TableHead className="text-center">APPROVE WITHDRAWL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedWithdrawals.map((request, index) => (
                        <TableRow key={request.id}>
                            <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell>{request.displayName}</TableCell>
                            <TableCell>{request.mobile}</TableCell>
                            <TableCell>₹{request.amount}</TableCell>
                            <TableCell>{formatDate(request.createdAt)}</TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm">Registered Bank Details</Button>
                            </TableCell>
                            <TableCell className="text-center">
                                {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleWithdrawalRequest(request, 'approved')}>
                                            Approve Now <CircleDollarSign className="ml-2 h-4 w-4" />
                                        </Button>
                                         <Button size="sm" variant="destructive" onClick={() => handleWithdrawalRequest(request, 'rejected')}>Reject</Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {paginatedWithdrawals.length === 0 && <p className="text-center text-muted-foreground mt-4">No pending withdrawal requests found.</p>}
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
             <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.withdrawals.length)} of {filteredData.withdrawals.length} entries</span>
            <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Previous</Button>
                 <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
        </div>
    </div>
  );
  
  const renderDepositsTable = () => (
     <div className="space-y-4">
        <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.deposits.map((request) => (
                        <TableRow key={request.id}>
                            <TableCell>{request.displayName}</TableCell>
                            <TableCell>{request.mobile}</TableCell>
                            <TableCell>₹{request.amount}</TableCell>
                            <TableCell>{request.paymentMethod}</TableCell>
                            <TableCell>{request.transactionId}</TableCell>
                            <TableCell><Badge>{request.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleDepositRequest(request, 'approved')}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDepositRequest(request, 'rejected')}>Reject</Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {filteredData.deposits.length === 0 && <p className="text-center text-muted-foreground mt-4">No pending deposit requests found.</p>}
        </div>
     </div>
  );

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Tabs defaultValue="withdrawals">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposits">Users Deposit Request</TabsTrigger>
                <TabsTrigger value="withdrawals">Users Withdraw Request</TabsTrigger>
            </TabsList>
            <TabsContent value="deposits" className="mt-4">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Users Deposit Request</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {loading ? <div className="flex justify-center h-48 items-center"><Loader /></div> : renderDepositsTable()}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="withdrawals" className="mt-4">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Users Withdraw Request</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {loading ? <div className="flex justify-center h-48 items-center"><Loader /></div> : renderWithdrawalsTable()}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
  );
}
