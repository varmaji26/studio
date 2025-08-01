
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, runTransaction, increment, getDoc, limit, startAfter, getDocs, Query } from 'firebase/firestore';
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

const PAGE_SIZE = 10;

export default function DepositsAndWithdrawalsPage() {
  const [depositRequests, setDepositRequests] = useState<Request[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Request[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<Request[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<Request[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingMoreDeposits, setLoadingMoreDeposits] = useState(false);
  const [loadingMoreWithdrawals, setLoadingMoreWithdrawals] = useState(false);

  const [lastDepositDoc, setLastDepositDoc] = useState<DocumentData | null>(null);
  const [lastWithdrawalDoc, setLastWithdrawalDoc] = useState<DocumentData | null>(null);
  
  const [hasMoreDeposits, setHasMoreDeposits] = useState(true);
  const [hasMoreWithdrawals, setHasMoreWithdrawals] = useState(true);

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

  const fetchInitialData = useCallback(async () => {
    setLoading(true);

    // Initial Deposits
    const initialDepositQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const depositSnapshot = await getDocs(initialDepositQuery);
    const depositDocs = depositSnapshot.docs;
    const depositsData = depositDocs.map(d => ({ id: d.id, ...d.data() }));
    const depositsWithUsers = await fetchUserDetails(depositsData);
    setDepositRequests(depositsWithUsers);
    setLastDepositDoc(depositDocs[depositDocs.length - 1]);
    setHasMoreDeposits(depositDocs.length === PAGE_SIZE);

    // Initial Withdrawals
    const initialWithdrawalQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const withdrawalSnapshot = await getDocs(initialWithdrawalQuery);
    const withdrawalDocs = withdrawalSnapshot.docs;
    const withdrawalsData = withdrawalDocs.map(d => ({ id: d.id, ...d.data() }));
    const withdrawalsWithUsers = await fetchUserDetails(withdrawalsData);
    setWithdrawalRequests(withdrawalsWithUsers);
    setLastWithdrawalDoc(withdrawalDocs[withdrawalDocs.length - 1]);
    setHasMoreWithdrawals(withdrawalDocs.length === PAGE_SIZE);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const loadMore = async (type: 'deposits' | 'withdrawals') => {
      if (type === 'deposits') {
          if (!hasMoreDeposits || loadingMoreDeposits) return;
          setLoadingMoreDeposits(true);

          let q: Query = query(collection(db, "deposits"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
          if(lastDepositDoc) {
            q = query(q, startAfter(lastDepositDoc));
          }

          const snapshot = await getDocs(q);
          const newDocs = snapshot.docs;
          if (newDocs.length > 0) {
              const newData = newDocs.map(d => ({ id: d.id, ...d.data() }));
              const newDataWithUsers = await fetchUserDetails(newData);
              setDepositRequests(prev => [...prev, ...newDataWithUsers]);
              setLastDepositDoc(newDocs[newDocs.length - 1]);
              setHasMoreDeposits(newDocs.length === PAGE_SIZE);
          } else {
              setHasMoreDeposits(false);
          }
          setLoadingMoreDeposits(false);
      } else {
          if (!hasMoreWithdrawals || loadingMoreWithdrawals) return;
          setLoadingMoreWithdrawals(true);
          
          let q: Query = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
          if(lastWithdrawalDoc) {
            q = query(q, startAfter(lastWithdrawalDoc));
          }

          const snapshot = await getDocs(q);
          const newDocs = snapshot.docs;
          if (newDocs.length > 0) {
              const newData = newDocs.map(d => ({ id: d.id, ...d.data() }));
              const newDataWithUsers = await fetchUserDetails(newData);
              setWithdrawalRequests(prev => [...prev, ...newDataWithUsers]);
              setLastWithdrawalDoc(newDocs[newDocs.length - 1]);
              setHasMoreWithdrawals(newDocs.length === PAGE_SIZE);
          } else {
              setHasMoreWithdrawals(false);
          }
          setLoadingMoreWithdrawals(false);
      }
  };


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
      
      setDepositRequests(prev => prev.map(r => r.id === request.id ? {...r, status} : r));
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

            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error(`User not found!`);

            if (status === 'approved') {
                const currentBalance = userDoc.data().balance || 0;
                if (currentBalance < request.amount) {
                     transaction.update(requestDocRef, { status: 'rejected' });
                     throw new Error("Insufficient balance. Request rejected.");
                }
                transaction.update(userDocRef, { balance: increment(-request.amount) });
                transaction.update(statsDocRef, { totalBalance: increment(-request.amount) });
            }
            
            transaction.update(requestDocRef, { status: status });
        });
        
        setWithdrawalRequests(prev => prev.map(r => r.id === request.id ? {...r, status} : r));
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

  const pendingDeposits = depositRequests.filter(r => r.status === 'pending').length;
  const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'pending').length;

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
                        <TabsTrigger value="deposits">Deposit Requests ({pendingDeposits})</TabsTrigger>
                        <TabsTrigger value="withdrawals">Withdrawal Requests ({pendingWithdrawals})</TabsTrigger>
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
                         {hasMoreDeposits && !searchTerm && (
                            <div className="text-center mt-4">
                                <Button onClick={() => loadMore('deposits')} disabled={loadingMoreDeposits}>
                                    {loadingMoreDeposits ? <Loader className="mr-2" /> : null}
                                    Load More
                                </Button>
                            </div>
                        )}
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
                        {hasMoreWithdrawals && !searchTerm && (
                            <div className="text-center mt-4">
                                <Button onClick={() => loadMore('withdrawals')} disabled={loadingMoreWithdrawals}>
                                    {loadingMoreWithdrawals ? <Loader className="mr-2" /> : null}
                                    Load More
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
