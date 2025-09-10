
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, DocumentData, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Label } from '@/components/ui/label';

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
    const [activeTab, setActiveTab] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
    const [toDate, setToDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        setLoading(true);

        const bidsQuery = query(
            collection(db, 'bids'),
            where('userId', '==', user.uid)
        );

        const unsubscribeBids = onSnapshot(bidsQuery, (querySnapshot) => {
            const bidsData: Bid[] = [];
            querySnapshot.forEach((doc) => {
                bidsData.push({ id: doc.id, ...doc.data() } as Bid);
            });
            bidsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
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

    const filteredBids = useMemo(() => {
        let filtered = bids;
        
        if (fromDate) {
            const startOfDay = new Date(fromDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = toDate ? new Date(toDate) : new Date(fromDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter(bid => {
                const bidDate = bid.createdAt.toDate();
                return bidDate >= startOfDay && bidDate <= endOfDay;
            });
        }
        
        if (activeTab === 'all') {
            return filtered;
        }
        return filtered.filter(bid => bid.status === activeTab);
    }, [bids, activeTab, fromDate, toDate]);

    const totalPages = Math.ceil(filteredBids.length / ITEMS_PER_PAGE);
    const paginatedBids = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBids.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredBids, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, fromDate, toDate]);

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

    const renderBidCards = (data: Bid[]) => (
        <div className="space-y-4 mt-4">
            {data.map((bid) => (
                <BidCard key={bid.id} bid={bid} />
            ))}
            {data.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">
                    {fromDate ? `No bids found for the selected date range.` : 
                     activeTab === 'all' ? "You haven't placed any bids yet." : `No ${activeTab} bids found.`}
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
        <div className="dark min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">Bids History</CardTitle>
                        <CardDescription>View all your past and current bids here.</CardDescription>
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
                        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                             <div className="flex items-center gap-2">
                                <Label htmlFor="from-date" className="text-sm shrink-0">From</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        id="from-date"
                                        variant={"outline"}
                                        className={cn(
                                          "w-full sm:w-[150px] justify-start text-left font-normal",
                                          !fromDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {fromDate ? format(fromDate, "dd/MM/yy") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={fromDate}
                                        onSelect={setFromDate}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="to-date" className="text-sm shrink-0">To</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        id="to-date"
                                        variant={"outline"}
                                        className={cn(
                                          "w-full sm:w-[150px] justify-start text-left font-normal",
                                          !toDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {toDate ? format(toDate, "dd/MM/yy") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                      <Calendar
                                        mode="single"
                                        selected={toDate}
                                        onSelect={setToDate}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                            </div>
                        </div>

                        <Tabs defaultValue="all" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="running">Running</TabsTrigger>
                                <TabsTrigger value="won">Won</TabsTrigger>
                                <TabsTrigger value="lost">Lost</TabsTrigger>
                            </TabsList>
                            <TabsContent value="all">
                                {renderBidCards(paginatedBids)}
                            </TabsContent>
                            <TabsContent value="running">
                                 {renderBidCards(paginatedBids)}
                            </TabsContent>
                             <TabsContent value="won">
                                {renderBidCards(paginatedBids)}
                            </TabsContent>
                             <TabsContent value="lost">
                                {renderBidCards(paginatedBids)}
                            </TabsContent>
                        </Tabs>
                        {renderPagination()}
                    </CardContent>
                </Card>
            </div>
             <BottomNavbar settings={settings} />
        </div>
    )
}
