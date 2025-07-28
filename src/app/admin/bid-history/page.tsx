
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Bid extends DocumentData {
    id: string;
    displayName: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    status: 'running' | 'won' | 'lost';
    createdAt: Timestamp;
}

export default function AdminBidHistoryPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [filteredBids, setFilteredBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

   useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "bids"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bidsData: Bid[] = [];
      querySnapshot.forEach((doc) => {
        bidsData.push({ id: doc.id, ...doc.data() } as Bid);
      });
      setBids(bidsData);
      setFilteredBids(bidsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching bids: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredBids(bids);
        return;
    }
    const filteredData = bids.filter((bid) => {
      return (
        bid.displayName?.toLowerCase().includes(lowercasedFilter) ||
        bid.gameName?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredBids(filteredData);
  }, [searchTerm, bids]);


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'won': return 'secondary';
        case 'lost': return 'destructive';
        case 'running':
        default:
            return 'default';
    }
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Bid History</CardTitle>
            <CardDescription>View all bids placed by users across all games.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Bids ({filteredBids.length})</h3>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by username or game..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-input h-10 rounded-lg pl-10"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Game</TableHead>
                                <TableHead>Bet Details</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBids.map((bid) => (
                                <TableRow key={bid.id}>
                                    <TableCell>{formatDate(bid.createdAt)}</TableCell>
                                    <TableCell>{bid.displayName}</TableCell>
                                    <TableCell>{bid.gameName} ({bid.session})</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{bid.betType}</span>
                                            <span className="text-xs text-muted-foreground">{bid.numbers.join(', ')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>₹{bid.totalAmount}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={getStatusBadgeVariant(bid.status)}
                                            className={bid.status === 'won' ? 'bg-green-500 text-white' : ''}
                                        >
                                            {bid.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {filteredBids.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm ? `No bids found for "${searchTerm}".` : "No bids found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
