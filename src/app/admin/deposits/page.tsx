
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, runTransaction, increment, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DepositRequest extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface WithdrawalRequest extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    amount: number;
    withdrawalMethod: string;
    withdrawalDetails: string;
    status: 'pending' | 'approved' | 'rejected';
}

export default function DepositsAndWithdrawalsPage() {
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const depositQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
    const unsubscribeDeposits = onSnapshot(depositQuery, (querySnapshot) => {
      const requestsData: DepositRequest[] = [];
      querySnapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...doc.data() } as DepositRequest);
      });
      requestsData.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
      setDepositRequests(requestsData);
    });

    const withdrawalQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubscribeWithdrawals = onSnapshot(withdrawalQuery, (querySnapshot) => {
        const requestsData: WithdrawalRequest[] = [];
        querySnapshot.forEach((doc) => {
            requestsData.push({ id: doc.id, ...doc.data() } as WithdrawalRequest);
        });
        requestsData.sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1));
        setWithdrawalRequests(requestsData);
    });

    setLoading(false);

    return () => {
        unsubscribeDeposits();
        unsubscribeWithdrawals();
    };
  }, []);

  const handleDepositRequest = async (request: DepositRequest, status: 'approved' | 'rejected') => {
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

  const handleWithdrawalRequest = async (request: WithdrawalRequest, status: 'approved' | 'rejected') => {
    const requestDocRef = doc(db, 'withdrawals', request.id);
    const userDocRef = doc(db, 'users', request.userId);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    
    try {
        await runTransaction(db, async (transaction) => {
            const requestDoc = await transaction.get(requestDocRef);
            if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
                throw new Error("This request has already been processed.");
            }

            // For rejections, we don't need to touch the user's balance.
            if (status === 'rejected') {
                transaction.update(requestDocRef, { status: 'rejected' });
                return;
            }

            // For approvals, check balance and deduct
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error(`User not found!`);

            const currentBalance = userDoc.data().balance || 0;
            if (currentBalance < request.amount) {
                 // If balance is insufficient, we reject the request and refund the user (by doing nothing to their balance).
                 transaction.update(requestDocRef, { status: 'rejected' });
                 throw new Error("Insufficient balance. Request rejected.");
            }

            // Proceed with deduction
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
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {depositRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{request.displayName}</TableCell>
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
                            {depositRequests.length === 0 && <p className="text-center text-muted-foreground mt-4">No deposit requests found.</p>}
                        </div>
                    </TabsContent>
                    <TabsContent value="withdrawals">
                         <div className="overflow-x-auto mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Details (e.g., UPI ID)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawalRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>{request.displayName}</TableCell>
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
                            {withdrawalRequests.length === 0 && <p className="text-center text-muted-foreground mt-4">No withdrawal requests found.</p>}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
