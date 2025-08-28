
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, runTransaction, increment, getDoc, where, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleDollarSign, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface Request extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    withdrawalMethod?: string;
    withdrawalDetails?: string;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const PAGE_SIZES = [10, 25, 50];

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRejectingAll, setIsRejectingAll] = useState(false);
  const { toast } = useToast();
  
  const fetchRequests = useCallback(async () => {
      const q = query(collection(db, "withdrawals"), where("status", "==", "pending"));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request));
          const dataWithUsers = await Promise.all(
              data.map(async (request) => {
                  if (!request.userId) return { ...request, mobile: 'N/A' };
                  const userDocRef = doc(db, 'users', request.userId);
                  const userDoc = await getDoc(userDocRef);
                  const userData = userDoc.exists() ? userDoc.data() : {};
                  return { ...request, mobile: userData.mobile || 'N/A' };
              })
          );
          dataWithUsers.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setRequests(dataWithUsers);
          setLoading(false);
      }, (error) => {
          console.error(`Error fetching pending withdrawals: `, error);
          setLoading(false);
      });
      return unsubscribe;
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = fetchRequests();
    return () => {
      unsub.then(u => u());
    };
  }, [fetchRequests]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

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
                // The amount was already deducted, so we just update the stats and status.
                transaction.update(statsDocRef, { totalBalance: increment(-request.amount) });
                transaction.update(requestDocRef, { status: 'approved' });
            } else { // status is 'rejected'
                // Refund the amount to the user's balance
                transaction.update(userDocRef, { balance: increment(request.amount) });
                transaction.update(requestDocRef, { status: 'rejected' });
            }
        });
        toast({ title: 'Success!', description: `Withdrawal request has been ${status}.` });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to process withdrawal.' });
    }
  };
  
  const handleRejectAll = async () => {
    setIsRejectingAll(true);
    if (requests.length === 0) {
        toast({ title: 'No pending requests to reject.' });
        setIsRejectingAll(false);
        return;
    }

    try {
        const batch = writeBatch(db);
        for (const request of requests) {
            const docRef = doc(db, 'withdrawals', request.id);
            batch.update(docRef, { status: 'rejected' });
            const userDocRef = doc(db, 'users', request.userId);
            batch.update(userDocRef, { balance: increment(request.amount) });
        }
        await batch.commit();
        toast({
            title: 'Success!',
            description: `All pending withdrawals have been rejected and refunded.`
        });
    } catch (error) {
        console.error(`Error rejecting all withdrawals:`, error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to reject all pending withdrawals.`
        });
    } finally {
        setIsRejectingAll(false);
    }
  };

  const filteredData = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) return requests;
    return requests.filter((req: Request) => 
        req.displayName?.toLowerCase().includes(lowercasedFilter) || 
        req.mobile?.includes(lowercasedFilter)
    );
  }, [searchTerm, requests]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const renderPagination = () => (
     <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
        <span>Showing {paginatedData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries</span>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || paginatedData.length === 0}>Next</Button>
        </div>
    </div>
  );

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">Pending Withdrawal Requests</CardTitle>
                    <CardDescription>Approve or reject user withdrawal requests.</CardDescription>
                </div>
                 {requests.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isRejectingAll}>
                                {isRejectingAll ? <Loader className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Reject All
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will reject all {requests.length} pending withdrawals and refund the amount to the users. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRejectAll}>Confirm Reject</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </CardHeader>
            <CardContent>
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span>Show</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                            <SelectTrigger className="w-[80px]"><SelectValue placeholder={itemsPerPage} /></SelectTrigger>
                            <SelectContent>{PAGE_SIZES.map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}</SelectContent>
                        </Select>
                        <span>entries</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Search:</span>
                        <Input placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-auto"/>
                    </div>
                </div>
                {loading ? <div className="flex justify-center h-48 items-center"><Loader /></div> : (
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
                                    <TableHead className="text-center">APPROVE WITHDRAWAL</TableHead>
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
                                            <div className="flex gap-2 justify-center">
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleWithdrawalRequest(request, 'approved')}>
                                                    Approve Now <CircleDollarSign className="ml-2 h-4 w-4" />
                                                </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleWithdrawalRequest(request, 'rejected')}>Reject</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {paginatedData.length === 0 && <p className="text-center text-muted-foreground mt-4">No pending withdrawal requests found.</p>}
                    </div>
                    {renderPagination()}
                </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

    

    