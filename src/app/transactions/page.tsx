
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet, ArrowDown, ArrowUp, MessageCircle, RotateCcw, Gift } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/bottom-navbar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


interface Transaction extends DocumentData {
    id: string;
    amount: number;
    status?: 'pending' | 'approved' | 'rejected' | 'won' | 'lost' | 'running' | 'cancelled' | 'reverted' | 'Given' | 'Reset';
    createdAt: Timestamp;
    type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus';
    description: string;
    title: string;
    bonusResetAmount?: number;
}

interface UserProfile extends DocumentData {
  balance?: number;
}

const ITEMS_PER_PAGE = 10;

const TransactionIcon = ({ type, status }: { type: Transaction['type'], status?: Transaction['status'] }) => {
    switch (type) {
        case 'deposit':
            return <div className="p-2 bg-green-500/20 rounded-full"><ArrowUp className="h-5 w-5 text-green-400" /></div>;
        case 'withdrawal':
            return <div className="p-2 bg-red-500/20 rounded-full"><ArrowDown className="h-5 w-5 text-red-400" /></div>;
        case 'win':
            return (
                <div className="p-2 bg-yellow-500/20 rounded-full">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4v-6h2v6h-2z"/>
                    </svg>
                </div>
            );
        case 'bonus':
            return <div className={`p-2 rounded-full ${status === 'Given' ? 'bg-green-500/20' : 'bg-red-500/20'}`}><Gift className={`h-5 w-5 ${status === 'Given' ? 'text-green-400' : 'text-red-400'}`} /></div>;
        case 'bet':
        default:
            return (
                 <div className="p-2 bg-orange-500/20 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 4H3.5C2.67 4 2 4.67 2 5.5v13c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-13c0-.83-.67-1.5-1.5-1.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
            );
    }
};

const TransactionItem = ({ transaction }: { transaction: Transaction; }) => {
    const isCredit = transaction.type === 'deposit' || transaction.type === 'win' || (transaction.type === 'bonus' && transaction.status === 'Given');
    const amountColor = isCredit ? 'text-green-400' : 'text-red-400';
    
    return (
        <div className={cn(
            "bg-card/80 p-3 rounded-lg shadow-sm flex items-center justify-between border border-white/10",
            transaction.type === 'win' && 'animate-won-glow'
        )}>
            <div className="flex items-center gap-3">
                <TransactionIcon type={transaction.type} status={transaction.status} />
                <div>
                    <h4 className="font-bold text-sm text-foreground">{transaction.title}</h4>
                    <p className="text-xs text-muted-foreground">{transaction.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-right">
                    <p className={cn("font-bold text-sm", amountColor)}>
                        {isCredit ? '+' : '-'}₹{transaction.amount}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function TransactionDetailsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [profile, setProfile] = useState<UserProfile>({});
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const { toast } = useToast();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        setLoading(true);

        const collectionsToQuery: { name: string; type: Transaction['type']; title: string; description: (doc: any) => string; }[] = [
            { name: 'deposits', type: 'deposit', title: 'Deposit', description: (doc: any) => `via ${doc.paymentMethod}` },
            { name: 'withdrawals', type: 'withdrawal', title: 'Withdraw', description: (doc: any) => `status: ${doc.status}` },
            { name: 'bids', type: 'bet', title: 'Bet Market', description: (doc: any) => `For bet ${doc.betType} ${doc.session}` },
            { name: 'bonusTransactions', type: 'bonus', title: 'Bonus', description: (doc: any) => doc.description },
        ];

        const unsubscribes = collectionsToQuery.map(({ name, type, title, description }) => {
            const q = query(collection(db, name), where('userId', '==', user.uid));
            return onSnapshot(q, (snapshot) => {
                const fetchedTransactions: Transaction[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (type === 'bet') {
                         if (data.status === 'won') {
                             fetchedTransactions.push({
                                id: `${doc.id}-win`,
                                amount: data.winningAmount,
                                createdAt: data.createdAt,
                                type: 'win',
                                title: 'Congratulations! you win',
                                description: `Your betting no ${data.numbers.join(',')} win`,
                                ...data
                            });
                        }
                    } else if (type === 'bonus') {
                        fetchedTransactions.push({
                            id: doc.id,
                            amount: data.amount,
                            createdAt: data.createdAt,
                            type: type,
                            title: data.type === 'Given' ? 'Bonus Given' : 'Bonus Reset',
                            description: description(data),
                            status: data.type, // Use 'type' from bonus as 'status'
                            ...data
                        });
                    } else {
                         fetchedTransactions.push({
                            id: doc.id,
                            amount: data.amount,
                            createdAt: data.createdAt,
                            type: type,
                            title: title,
                            description: description(data),
                            ...data
                        });
                    }
                });

                setTransactions(prev => {
                    const otherTransactions = prev.filter(t => t.type !== type && (type !== 'bet' || t.type !== 'win') && t.type !== 'bonus');
                    return [...otherTransactions, ...fetchedTransactions];
                });
            });
        });

        const userDocRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setProfile(doc.data() as UserProfile);
            }
        });

        setLoading(false);

        return () => {
            unsubscribes.forEach(unsub => unsub());
            unsubProfile();
        };

    }, [user?.uid, authLoading, router]);

     const handleCancelWithdrawal = async (transactionToCancel: Transaction) => {
        if (!user) return;

        const withdrawalDocRef = doc(db, 'withdrawals', transactionToCancel.id);
        const userDocRef = doc(db, 'users', user.uid);

        try {
            await runTransaction(db, async (transaction) => {
                const withdrawalDoc = await transaction.get(withdrawalDocRef);
                if (!withdrawalDoc.exists() || withdrawalDoc.data().status !== 'pending') {
                    throw new Error("This withdrawal request cannot be cancelled anymore.");
                }

                // Update withdrawal status to 'reverted'
                transaction.update(withdrawalDocRef, { status: 'reverted' });

                // Refund the amount to the user's real balance
                transaction.update(userDocRef, { balance: increment(withdrawalDoc.data().amount) });
                
                // If a bonus was reset, restore it
                const bonusToRestore = withdrawalDoc.data().bonusResetAmount || 0;
                if (bonusToRestore > 0) {
                    transaction.update(userDocRef, { bonusBalance: increment(bonusToRestore) });
                }
            });

            toast({
                title: "Withdrawal Cancelled",
                description: `Your request for ₹${transactionToCancel.amount} has been successfully cancelled.`,
            });

        } catch (error: any) {
            console.error("Error cancelling withdrawal:", error);
            toast({
                variant: "destructive",
                title: "Cancellation Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    };


    const sortedTransactions = useMemo(() => {
        const filtered = transactions.filter(t => t.type !== 'bet');
        return filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [transactions]);
    
    const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedTransactions, currentPage]);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        PREV
                    </Button>
                    <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        NEXT
                    </Button>
                </div>
            </div>
        )
    }
    
    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-20 w-20 text-primary" />
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background text-foreground flex flex-col pb-28">
            <header className="bg-card/80 p-4 sticky top-0 z-10 border-b border-white/10 backdrop-blur-sm">
                 <div className="flex items-center gap-4 text-white">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                            <ArrowLeft />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">Transaction Details</h1>
                </div>
            </header>
            <main className="flex-1 flex flex-col">
                 <div className="bg-card/80 p-4">
                    <div className="bg-teal-900/50 rounded-t-2xl p-6 text-center shadow-lg border-x border-t border-teal-500/30">
                        <p className="text-teal-200">Total Balance</p>
                        <p className="text-4xl font-bold text-primary mt-2">₹{profile.balance?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>
                 <div className="bg-background flex-1 p-4 -mt-2">
                    <h2 className="text-lg font-bold text-foreground mb-4 bg-teal-900/50 p-2 rounded-md text-center text-teal-200">Transactions</h2>
                     <div className="space-y-3">
                        {paginatedTransactions.length > 0 ? (
                            paginatedTransactions.map(t => <TransactionItem key={t.id} transaction={t} />)
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No transactions found.</p>
                            </div>
                        )}
                    </div>
                    {renderPagination()}
                </div>
            </main>
            <BottomNavbar />
        </div>
    );
}
