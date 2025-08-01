
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, ArrowDown, ArrowUp, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


interface Transaction extends DocumentData {
    id: string;
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

export default function PaymentHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const depositQuery = query(collection(db, 'deposits'), where('userId', '==', user.uid));
        const depositsUnsub = onSnapshot(depositQuery, (snapshot) => {
            const deposits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'deposit' })) as Transaction[];
            setTransactions(prev => {
                const withdrawals = prev.filter(t => t.type === 'withdrawal');
                const all = [...deposits, ...withdrawals].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                return all;
            });
            setLoading(false);
        });

        const withdrawalQuery = query(collection(db, 'withdrawals'), where('userId', '==', user.uid));
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

    }, [user, authLoading, router]);

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
    }

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text("Payment History", 14, 16);

        const tableColumn = ["Date", "Type", "Amount", "Method", "Status"];
        const tableRows: (string | number)[][] = [];

        transactions.forEach(t => {
            const transactionData = [
                formatDate(t.createdAt),
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

        doc.save('payment-history.pdf');
    };
    
    const renderTable = (data: Transaction[]) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
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
                    No transactions of this type found.
                 </p>
            )}
        </div>
    );

    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2">
                                    <CreditCard />
                                    Payment History
                                </CardTitle>
                                <CardDescription>View your deposit and withdrawal history.</CardDescription>
                            </div>
                             <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={transactions.length === 0}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                         <div className="pt-4">
                            <Button asChild variant="ghost" className="pl-0">
                                <Link href="/" className="inline-flex items-center gap-2 text-sm text-green-500 hover:underline">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all" className="mt-4">
                                {renderTable(transactions)}
                            </TabsContent>
                            <TabsContent value="deposits" className="mt-4">
                                {renderTable(transactions.filter(t => t.type === 'deposit'))}
                            </TabsContent>
                             <TabsContent value="withdrawals" className="mt-4">
                                {renderTable(transactions.filter(t => t.type === 'withdrawal'))}
                            </TabsContent>
                        </Tabs>

                        {transactions.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground mt-4">You have no payment history yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
