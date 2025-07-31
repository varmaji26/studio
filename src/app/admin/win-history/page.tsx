
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Search, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Win extends DocumentData {
    id: string;
    displayName: string;
    gameName: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
    winningAmount: number;
    createdAt: Timestamp;
}

export default function AdminWinHistoryPage() {
  const [wins, setWins] = useState<Win[]>([]);
  const [filteredWins, setFilteredWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

   useEffect(() => {
    setLoading(true);
    const q = query(
        collection(db, "bids"), 
        where("status", "==", "won")
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const winsData: Win[] = [];
      querySnapshot.forEach((doc) => {
        winsData.push({ id: doc.id, ...doc.data() } as Win);
      });
      // Sort wins by creation date in descending order on the client
      winsData.sort((a, b) => {
          const dateA = a.createdAt?.toMillis() || 0;
          const dateB = b.createdAt?.toMillis() || 0;
          return dateB - dateA;
      });
      setWins(winsData);
      setFilteredWins(winsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching wins: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredWins(wins);
        return;
    }
    const filteredData = wins.filter((win) => {
      return (
        win.displayName?.toLowerCase().includes(lowercasedFilter) ||
        win.gameName?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredWins(filteredData);
  }, [searchTerm, wins]);


  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-GB');
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="text-amber-400" />
                Win History
            </CardTitle>
            <CardDescription>View all winning bids and payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Wins ({filteredWins.length})</h3>
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
                                <TableHead>Bet Amount</TableHead>
                                <TableHead>Win Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWins.map((win) => (
                                <TableRow key={win.id}>
                                    <TableCell>{formatDate(win.createdAt)}</TableCell>
                                    <TableCell>{win.displayName}</TableCell>
                                    <TableCell>{win.gameName} ({win.session})</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{win.betType}</span>
                                            <span className="text-xs text-muted-foreground">{win.numbers.join(', ')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>₹{win.totalAmount}</TableCell>
                                     <TableCell className="font-bold text-green-400">
                                        ₹{win.winningAmount.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {filteredWins.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm ? `No wins found for "${searchTerm}".` : "No wins found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
