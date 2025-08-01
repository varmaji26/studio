
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, runTransaction, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Request extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string; // Add mobile number
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    // Deposit specific
    paymentMethod?: string;
    transactionId?: string;
    // Withdrawal specific
    withdrawalMethod?: string;
    withdrawalDetails?: string;
}

export default function DepositsAndWithdrawalsPage() {
  const [depositRequests, setDepositRequests] = useState<Request[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Request[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<Request[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchUserDetails = async (requests: DocumentData[]): Promise<Request[]> => {
    const requestsWithUsers = await Promise.all(
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
    return requestsWithUsers;
  };

  useEffect(() => {
    setLoading(true);

    const depositQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const unsubscribeDeposits = onSnapshot(depositQuery, async (querySnapshot) => {
      const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const depositsWithUsers = await fetchUserDetails(requestsData);
      depositsWithUsers.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
      setDepositRequests(depositsWithUsers);
      setLoading(false);
    });

    const withdrawalQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubscribeWithdrawals = onSnapshot(withdrawalQuery, async (querySnapshot) => {
        const requestsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const withdrawalsWithUsers = await fetchUserDetails(requestsData);
        withdrawalsWithUsers.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
        setWithdrawalRequests(withdrawalsWithUsers);
        setLoading(false);
    });

    return () => {
        unsubscribeDeposits();
        unsubscribeWithdrawals();
    };
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredDeposits(depositRequests);
        setFilteredWithdrawals(withdrawalRequests);
        return;
    }
    const filterRequests = (requests: Request[]) => {
      return requests.filter((req) => 
        req.displayName?.toLowerCase().includes(lowercasedFilter) ||
        req.mobile?.toLowerCase().includes(lowercasedFilter)
      );
    }
    setFilteredDeposits(filterRequests(depositRequests));
    setFilteredWithdrawals(filterRequests(withdrawalRequests));
  }, [searchTerm, depositRequests, withdrawalRequests]);

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
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) throw new Error(`User not found!`);
          
          transaction.update(userDocRef, { balance: increment(request.amount) });
          transaction.update(statsDocRef, { totalBalance: increment(request.amount) });
        }
        
        transaction.update(requestDocRef, { status: status });
      });

      toast({ title: 'Success!', description: `Request has been ${status}.` });
    } catch (error: any) {
        console.error("Error updating request: ", error);
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

            if (status === 'rejected') {
                transaction.update(requestDocRef, { status: 'rejected' });
                return;
            }

            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error(`User not found!`);

            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < request.amount) {
                 transaction.update(requestDocRef, { status: 'rejected' });
                 throw new Error("Insufficient balance. Request rejected.");
            }

            transaction.update(userDocRef, { balance: increment(-request.amount) });
            transaction.update(statsDocRef, { totalBalance: increment(-request.amount) });
            transaction.update(requestDocRef, { status: 'approved' });
        });

        toast({ title: 'Success!', description: `Withdrawal request has been ${status}.` });
    } catch(error: any) {
        console.error("Error processing withdrawal: ", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process withdrawal.' });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'approved': return <Badge className="bg-green-500 text-white hover:bg-green-600">Approved</Badge>;
        case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
        case 'pending':
        default:
            return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Deposits & Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or mobile..."
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
                <Tabs defaultValue="deposits">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="deposits">Deposit Requests ({depositRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
                        <TabsTrigger value="withdrawals">Withdrawal Requests ({withdrawalRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="deposits">
                        <div className="overflow-x-auto mt-4">
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
                                    {filteredDeposits.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{request.displayName}</TableCell>
                                            <TableCell>{request.mobile}</TableCell>
                                            <TableCell>₹{request.amount}</TableCell>
                                            <TableCell>{request.paymentMethod}</TableCell>
                                            <TableCell>{request.transactionId}</TableCell>
                                            <TableCell>{getStatusBadge(request.status)}</TableCell>
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
                            {filteredDeposits.length === 0 && <p className="text-center text-muted-foreground mt-4">No deposit requests found.</p>}
                        </div>
                    </TabsContent>
                    <TabsContent value="withdrawals">
                         <div className="overflow-x-auto mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Mobile</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Details (e.g., UPI ID)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWithdrawals.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{request.displayName}</TableCell>
                                            <TableCell>{request.mobile}</TableCell>
                                            <TableCell>₹{request.amount}</TableCell>
                                            <TableCell>{request.withdrawalMethod}</TableCell>
                                            <TableCell>{request.withdrawalDetails}</TableCell>
                                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                                            <TableCell className="text-right">
                                                {request.status === 'pending' && (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleWithdrawalRequest(request, 'approved')}>Approve</Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleWithdrawalRequest(request, 'rejected')}>Reject</Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredWithdrawals.length === 0 && <p className="text-center text-muted-foreground mt-4">No withdrawal requests found.</p>}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
