
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Bid extends DocumentData {
    id: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    status: 'running' | 'won' | 'lost' | 'cancelled';
    createdAt: Timestamp;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
    telegramLink?: string;
}

const ITEMS_PER_PAGE = 10;

const BidCard = ({ bid }: { bid: Bid }) => {
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };
    
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'won': return 'secondary';
            case 'lost': return 'destructive';
            case 'cancelled': return 'outline';
            case 'running':
            default:
                return 'default';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            <div className="bg-[#004D40] text-white text-center py-2">
                <h3 className="font-bold">{bid.gameName} ({bid.session})</h3>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-3 text-center text-sm">
                    <div>
                        <p className="text-gray-500">Game Type</p>
                        <p className="font-semibold text-black">{bid.betType}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Digit</p>
                        <p className="font-semibold text-black">{bid.numbers.join(', ')}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Points</p>
                        <p className="font-semibold text-black">{bid.totalAmount}</p>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-600">
                Transaction: {formatDate(bid.createdAt)}
            </div>
            <div className="border-t border-gray-200 px-4 py-2 text-center">
                 <Badge 
                    variant={getStatusBadgeVariant(bid.status)}
                    className={cn(
                        bid.status === 'won' && 'bg-green-500 text-white',
                        bid.status === 'lost' && 'bg-red-500 text-white',
                        bid.status === 'running' && 'bg-orange-500 text-white',
                        bid.status === 'cancelled' && 'border-yellow-500 text-yellow-500',
                    )}
                >
                    {bid.status}
                </Badge>
            </div>
        </div>
    );
};

export default function BidsHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings>({});
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        setLoading(true);

        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = [];
            querySnapshot.forEach((doc) => {
                bidsData.push({ id: doc.id, ...doc.data() } as Bid);
            });
            setBids(bidsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bids history: ", error);
            setLoading(false);
        });
        
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            }
        });

        return () => {
            unsubscribeBids();
            unsubscribeSettings();
        };
    }, [user, authLoading, router]);

    const totalPages = Math.ceil(bids.length / ITEMS_PER_PAGE);
    const paginatedBids = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return bids.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [bids, currentPage]);
    
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
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground">
            <header className="bg-card/80 p-4 sticky top-0 z-10 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold">My Bids</h1>
                </div>
            </header>
            <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
                {paginatedBids.length > 0 ? (
                    <div className="space-y-4">
                        {paginatedBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
                    </div>
                ) : (
                    <div className="text-center py-10">
                         <p className="mt-4 text-muted-foreground">You haven't placed any bids yet.</p>
                    </div>
                )}
                 {renderPagination()}
            </main>
             <BottomNavbar settings={settings} />
        </div>
    )
}
