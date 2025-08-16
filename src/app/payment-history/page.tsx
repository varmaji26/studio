
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, ArrowDown, ArrowUp, Download, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/bottom-navbar';

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

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

const ITEMS_PER_PAGE = 10;

export default function PaymentHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [settings, setSettings] = useState<AppSettings>({});

    useEffect(() => {
        // This sets the initial date to today when the component mounts.
        setSelectedDate(new Date());
    }, []);

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
        
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            }
        });

        return () => {
            depositsUnsub();
            withdrawalsUnsub();
            unsubscribeSettings();
        };

    }, [user, authLoading, router]);

    const filteredTransactions = useMemo(() => {
        let filtered = transactions;
        
        const dateToFilter = selectedDate || new Date(); // Default to today if no date is selected
        const startOfDay = new Date(dateToFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateToFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(t => {
            const tDate = t.createdAt.toDate();
            return tDate >= startOfDay && tDate <= endOfDay;
        });
        return filtered;
    }, [transactions, selectedDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

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

        const tableColumn = ["Date", "Type", "Amount (INR)", "Method", "Status"];
        const tableRows: (string | number)[][] = [];

        transactions.forEach(t => {
            const transactionData = [
                formatDate(t.createdAt),
                t.type,
                t.amount,
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

    const renderPagination = (data: Transaction[]) => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
                <div>
                    Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, data.length)}</strong> of <strong>{data.length}</strong> entries
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        )
    }
    
    const renderTable = (data: Transaction[]) => (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-[9px]">Date</TableHead>
                        <TableHead className="text-[9px]">Type</TableHead>
                        <TableHead className="text-[9px]">Amount</TableHead>
                        <TableHead className="text-[9px]">Method</TableHead>
                        <TableHead className="text-[9px]">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell className="text-[9px]">{formatDate(t.createdAt)}</TableCell>
                            <TableCell className="text-[9px]">
                                <Badge variant={t.type === 'deposit' ? 'default' : 'outline'} className={cn('text-[9px]', t.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>
                                    {t.type === 'deposit' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                                    {t.type}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-[9px]">₹{t.amount}</TableCell>
                            <TableCell className="text-[9px]">{t.paymentMethod || t.withdrawalMethod}</TableCell>
                            <TableCell className="text-[9px]">
                                <Badge 
                                    variant={getStatusBadgeVariant(t.status)}
                                    className={cn(
                                        'text-[9px]',
                                        t.status === 'approved' ? 'bg-green-500 text-white' : 
                                        t.status === 'rejected' ? 'bg-red-500 text-white' : ''
                                    )}
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
                    No transactions found for the selected criteria.
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
        <div className="dark min-h-screen bg-background text-foreground pb-28">
            <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
                        <div className="flex justify-end mb-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full sm:w-[280px] justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Tabs defaultValue="all">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all" className="mt-4">
                                {renderTable(paginatedTransactions)}
                                {renderPagination(filteredTransactions)}
                            </TabsContent>
                            <TabsContent value="deposits" className="mt-4">
                                {renderTable(paginatedTransactions.filter(t => t.type === 'deposit'))}
                                {renderPagination(filteredTransactions.filter(t => t.type === 'deposit'))}
                            </TabsContent>
                             <TabsContent value="withdrawals" className="mt-4">
                                {renderTable(paginatedTransactions.filter(t => t.type === 'withdrawal'))}
                                {renderPagination(filteredTransactions.filter(t => t.type === 'withdrawal'))}
                            </TabsContent>
                        </Tabs>

                        {transactions.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground mt-4">You have no payment history yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <BottomNavbar settings={settings} />
        </div>
    )
}
