
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface DepositRequest extends DocumentData {
    id: string;
    displayName: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    status: 'pending' | 'approved' | 'rejected';
}

export default function DepositsPage() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "deposits"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestsData: DepositRequest[] = [];
      querySnapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...doc.data() } as DepositRequest);
      });
      setRequests(requestsData.sort((a, b) => (a.status === 'pending' ? -1 : 1)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateRequest = async (id: string, status: 'approved' | 'rejected') => {
    const requestDocRef = doc(db, 'deposits', id);
    try {
        await updateDoc(requestDocRef, { status });
        toast({
            title: 'Success!',
            description: `Request has been ${status}.`
        });
    } catch (error) {
        console.error("Error updating request: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update request status.'
        });
    }
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Deposit Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
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
                            {requests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>{request.displayName}</TableCell>
                                    <TableCell>₹{request.amount}</TableCell>
                                    <TableCell>{request.paymentMethod}</TableCell>
                                    <TableCell>{request.transactionId}</TableCell>
                                    <TableCell>
                                        <Badge variant={request.status === 'pending' ? 'default' : request.status === 'approved' ? 'secondary' : 'destructive'} className={request.status === 'approved' ? 'bg-green-500' : ''}>
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateRequest(request.id, 'approved')}>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(request.id, 'rejected')}>Reject</Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {requests.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">No deposit requests found.</p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
