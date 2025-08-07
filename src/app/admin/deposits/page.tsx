
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, onSnapshot, doc, DocumentData, orderBy, getDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { MailQuestion } from 'lucide-react';

interface Request extends DocumentData {
    id: string;
    userId: string;
    displayName: string;
    mobile?: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const PAGE_SIZES = [10, 25, 50, 100];

const HistoryTable = ({ title, data, loading }: { title: string; data: Request[]; loading: boolean; }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredData = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        if (!lowercasedFilter) return data;
        return data.filter((req: Request) => 
            req.displayName?.toLowerCase().includes(lowercasedFilter) || 
            req.mobile?.includes(lowercasedFilter)
        );
    }, [searchTerm, data]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    return (
        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
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
                 {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader />
                    </div>
                ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SL</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {paginatedData.length === 0 && <p className="text-center text-muted-foreground mt-4">No records found.</p>}
                    </div>
                     <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                        <span>Showing {paginatedData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                            <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || paginatedData.length === 0}>Next</Button>
                        </div>
                    </div>
                </>
                )}
            </CardContent>
        </Card>
    );
};

export default function ApprovedHistoryPage() {
  const [depositHistory, setDepositHistory] = useState<Request[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async (collectionName: 'deposits' | 'withdrawals', setData: React.Dispatch<React.SetStateAction<Request[]>>) => {
      // Query only by status to avoid needing a composite index
      const q = query(collection(db, collectionName), where("status", "==", "approved"));
      
      const fetchUserDetails = async (requests: DocumentData[]): Promise<Request[]> => {
          return Promise.all(
              requests.map(async (request) => {
                  if (!request.userId) return { ...request, mobile: 'N/A' } as Request;
                  const userDocRef = doc(db, 'users', request.userId);
                  const userDoc = await getDoc(userDocRef);
                  const userData = userDoc.exists() ? userDoc.data() : {};
                  return { ...request, mobile: userData.mobile || 'N/A' } as Request;
              })
          );
      };

      const unsubscribe = onSnapshot(q, async (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const dataWithUsers = await fetchUserDetails(data);
          // Sort client-side to avoid composite index
          dataWithUsers.sort((a, b) => {
              const dateA = a.createdAt?.toMillis() || 0;
              const dateB = b.createdAt?.toMillis() || 0;
              return dateB - dateA;
          });
          setData(dataWithUsers);
          setLoading(false);
      }, (error) => {
          console.error(`Error fetching ${collectionName}: `, error);
          setLoading(false);
      });

      return unsubscribe;
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubDeposits = fetchHistory('deposits', setDepositHistory);
    const unsubWithdrawals = fetchHistory('withdrawals', setWithdrawalHistory);

    const timer = setTimeout(() => {
        if (loading) {
            setLoading(false);
        }
    }, 3000);

    return () => {
      clearTimeout(timer);
      unsubDeposits.then(unsub => unsub());
      unsubWithdrawals.then(unsub => unsub());
    };
  }, [fetchHistory, loading]);

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-3xl font-bold">Transaction History</CardTitle>
                        <CardDescription>View all approved deposits and withdrawals.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/admin/pending-requests" className="flex items-center gap-2">
                           <MailQuestion className="h-5 w-5" />
                           Manage Pending Requests
                        </Link>
                    </Button>
                </div>
            </CardHeader>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HistoryTable title="Approved Deposit History" data={depositHistory} loading={loading} />
            <HistoryTable title="Approved Withdrawal History" data={withdrawalHistory} loading={loading} />
        </div>
    </div>
  );
}
