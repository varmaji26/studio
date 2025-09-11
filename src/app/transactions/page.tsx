
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet, ArrowDown, ArrowUp, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Transaction extends DocumentData {
    id: string;
    amount: number;
    status?: 'pending' | 'approved' | 'rejected' | 'won' | 'lost' | 'running' | 'cancelled';
    createdAt: Timestamp;
    type: 'deposit' | 'withdrawal' | 'bet' | 'win';
    description: string;
    title: string;
}

interface UserProfile extends DocumentData {
  balance?: number;
}

const TransactionIcon = ({ type }: { type: Transaction['type'] }) => {
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

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
    const isCredit = transaction.type === 'deposit' || transaction.type === 'win';
    const amountColor = isCredit ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-card/80 p-3 rounded-lg shadow-sm flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
                <TransactionIcon type={transaction.type} />
                <div>
                    <h4 className="font-bold text-sm text-foreground">{transaction.title}</h4>
                    <p className="text-xs text-muted-foreground">{transaction.description}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={cn("font-bold text-sm", amountColor)}>
                    {isCredit ? '+' : '-'}₹{transaction.amount}
                </p>
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

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        setLoading(true);

        const collectionsToQuery = [
            { name: 'deposits', type: 'deposit', title: 'Deposit', description: (doc: any) => `via ${doc.paymentMethod}` },
            { name: 'withdrawals', type: 'withdrawal', title: 'Withdraw', description: (doc: any) => `status: ${doc.status}` },
            { name: 'bids', type: 'bet', title: 'Bet Market', description: (doc: any) => `For bet ${doc.betType} ${doc.session}` },
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
                        // Omit the 'bet' type transaction
                    } else {
                         fetchedTransactions.push({
                            id: doc.id,
                            amount: data.amount,
                            createdAt: data.createdAt,
                            type,
                            title,
                            description: description(data),
                            ...data
                        });
                    }
                });

                setTransactions(prev => {
                    const otherTransactions = prev.filter(t => t.type !== type && t.type !== 'win');
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

    }, [user, authLoading, router]);

    const sortedTransactions = useMemo(() => {
        return transactions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }, [transactions]);
    
    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background text-foreground flex flex-col">
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
                    <div className="bg-background rounded-t-2xl p-6 text-center shadow-lg border-x border-t border-white/10">
                        <p className="text-muted-foreground">Total Balance</p>
                        <p className="text-4xl font-bold text-primary mt-2">₹{profile.balance?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>
                 <div className="bg-background flex-1 p-4 -mt-2">
                    <h2 className="text-lg font-bold text-foreground mb-4">Transactions</h2>
                     <div className="space-y-3">
                        {sortedTransactions.length > 0 ? (
                            sortedTransactions.map(t => <TransactionItem key={t.id} transaction={t} />)
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">No transactions found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
