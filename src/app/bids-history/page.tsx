
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, DocumentData, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
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
    const formatDate = (timestamp: Timestamp | null | undefined) => {
        if (!timestamp || !timestamp.seconds) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).replace(/,/g, '');
    };
    
    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'won': return '🎉 You Won! 🎉';
            case 'lost': return 'Better luck next time';
            case 'cancelled': return 'Bid Cancelled';
            case 'running':
            default:
                return 'Best of luck ⏳';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 text-black">
            <div className="bg-[#004D40] text-white text-center py-2">
                <h3 className="font-bold">{bid.gameName.toUpperCase()} ({bid.session.toUpperCase()})</h3>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-3 text-center text-sm">
                    <div>
                        <p className="text-gray-500">Game Type</p>
                        <p className="font-semibold">{bid.betType}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Digit</p>
                        <p className="font-semibold">{bid.numbers.join(', ')}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Points</p>
                        <p className="font-semibold">{bid.totalAmount}</p>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
                Transaction: {formatDate(bid.createdAt)}
            </div>
            <div className="border-t border-gray-200 px-4 py-2 text-center font-semibold text-orange-500">
                 {getStatusMessage(bid.status)}
            </div>
        </div>
    );
};

export default function BidsHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [settings, setSettings] = useState<AppSettings>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    const fetchBidsAndSettings = useCallback((userId: string) => {
        setLoadingData(true);
        
        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid));
            setBids(bidsData);
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching bids: ", error);
            setLoadingData(false);
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
    }, []);

    useEffect(() => {
        if (user?.uid) {
            const cleanup = fetchBidsAndSettings(user.uid);
            return () => cleanup();
        } else if (!authLoading) {
            setLoadingData(false); // No user, so not loading
        }
    }, [user?.uid, authLoading, fetchBidsAndSettings]);
    
    const filteredBids = useMemo(() => {
        if (!selectedDate) {
            return bids;
        }
        
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        return bids.filter(bid => {
            if (!bid.createdAt?.seconds) return false;
            const bidDate = new Date(bid.createdAt.seconds * 1000);
            return bidDate >= startOfDay && bidDate <= endOfDay;
        });
    }, [bids, selectedDate]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate]);

    const totalBiddingAmount = useMemo(() => {
        return filteredBids.reduce((acc, bid) => acc + (bid.totalAmount || 0), 0);
    }, [filteredBids]);

    const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
    const paginatedBids = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBids.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredBids, currentPage]);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
                <div>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
            </div>
        );
    };

    if (authLoading || loadingData) {
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
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <Card className="w-full sm:w-auto bg-card/80 border-white/10 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Bidding Amount</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{totalBiddingAmount.toLocaleString('en-IN')}</div>
                            <p className="text-xs text-muted-foreground">For {selectedDate ? format(selectedDate, "PPP") : 'all time'}</p>
                        </CardContent>
                    </Card>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[220px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd MMM, yyyy") : <span>Pick a date</span>}
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
                
                {paginatedBids.length > 0 ? (
                    <>
                        <div className="space-y-4">
                            {paginatedBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
                        </div>
                        {renderPagination()}
                    </>
                ) : (
                    <div className="text-center py-10">
                         <p className="mt-4 text-muted-foreground">You haven't placed any bids for the selected date.</p>
                    </div>
                )}
            </main>
             <BottomNavbar settings={settings} />
        </div>
    )
}
