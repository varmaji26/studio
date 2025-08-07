
'use client';

import { useState, useEffect, useMemo } from 'react';
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
};

const PAGE_SIZES = [10, 25, 50];

export default function DepositsAndWithdrawalsPage() {
  const [depositRequests, setDepositRequests] = useState<Request[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('withdrawals');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const fetchUserDetails = async (requests: DocumentData[]): Promise<Request[]> => {
      return Promise.all(
        requests.map(async (request) => {
          if (!request.userId) {
             return { ...request, mobile: 'N/A' } as Request;
          }
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

    let depositsLoaded = false;
    let withdrawalsLoaded = false;

    const checkLoadingDone = () => {
        if (depositsLoaded && withdrawalsLoaded) {
            setLoading(false);
        }
    }

    const depositsQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(depositsQuery, async (snapshot) => {
      const depositsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const depositsWithUsers = await fetchUserDetails(depositsData);
      setDepositRequests(depositsWithUsers);
      depositsLoaded = true;
      checkLoadingDone();
    }, (error) => {
        console.error("Error fetching deposits: ", error);
        depositsLoaded = true;
        checkLoadingDone();
    });

    const withdrawalsQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubWithdrawals = onSnapshot(withdrawalsQuery, async (snapshot) => {
      const withdrawalsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const withdrawalsWithUsers = await fetchUserDetails(withdrawalsData);
      setWithdrawalRequests(withdrawalsWithUsers);
      withdrawalsLoaded = true;
      checkLoadingDone();
    }, (error) => {
        console.error("Error fetching withdrawals: ", error);
        withdrawalsLoaded = true;
        checkLoadingDone();
    });

    return () => {
      unsubDeposits();
      unsubWithdrawals();
    };
  }, []);
  
  // Reset pagination when tab or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

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
  
  const sourceData = activeTab === 'deposits' ? pendingDeposits : pendingWithdrawals;

  const filteredData = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) return sourceData;
    return sourceData.filter((req: Request) => 
        req.displayName?.toLowerCase().includes(lowercasedFilter) || 
        req.mobile?.includes(lowercasedFilter)
    );
  }, [searchTerm, sourceData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);


  const renderControls = () => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
        <span>Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent>
                {PAGE_SIZES.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}
            </SelectContent>
        </Select>
        <span>entries</span>
    </div>
    <div className="flex items-center gap-2">
        <span>Search:</span>
        <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-auto"
        />
    </div>
    </div>
  );

  const renderPagination = () => (
     <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries</span>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || paginatedData.length === 0}>Next</Button>
        </div>
    </div>
  );
  
  const renderWithdrawalsTable = () => (
    <div className="space-y-4">
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
                    {paginatedData.map((request, index) => (
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
             {paginatedData.length === 0 && <p className="text-center text-muted-foreground mt-4">No pending withdrawal requests found.</p>}
        </div>
    </div>
  );
  
  const renderDepositsTable = () => (
     <div className="space-y-4">
        <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>SL</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((request, index) => (
                        <TableRow key={request.id}>
                            <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell>{request.displayName}</TableCell>
                            <TableCell>{request.mobile}</TableCell>
                            <TableCell>₹{request.amount}</TableCell>
                            <TableCell>{request.paymentMethod}</TableCell>
                            <TableCell>{request.transactionId}</TableCell>
                            <TableCell><Badge>{request.status}</Badge></TableCell>
                            <TableCell className="text-center">
                                {request.status === 'pending' && (
                                    <div className="flex gap-2 justify-center">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleDepositRequest(request, 'approved')}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDepositRequest(request, 'rejected')}>Reject</Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {paginatedData.length === 0 && <p className="text-center text-muted-foreground mt-4">No pending deposit requests found.</p>}
        </div>
     </div>
  );
  
  const renderContent = () => {
      if (loading) {
          return <div className="flex justify-center h-48 items-center"><Loader /></div>;
      }

      return (
          <div className="space-y-4">
              {renderControls()}
              {activeTab === 'deposits' ? renderDepositsTable() : renderWithdrawalsTable()}
              {renderPagination()}
          </div>
      );
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Tabs defaultValue="withdrawals" onValueChange={setActiveTab}>
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
                       {renderContent()}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="withdrawals" className="mt-4">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Users Withdraw Request</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {renderContent()}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
  );
}
