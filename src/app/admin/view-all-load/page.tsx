
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Bid extends DocumentData {
    gameName: string;
    betType: string;
    session: string;
    totalAmount: number;
}

interface GroupedLoad {
    [key: string]: {
        [key: string]: {
            [key: string]: number;
        };
    };
}

export default function ViewAllLoadPage() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [groupedLoad, setGroupedLoad] = useState<GroupedLoad>({});
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [totalLoad, setTotalLoad] = useState(0);

  useEffect(() => {
    const fetchBidsAndGames = async () => {
      setLoading(true);
      try {
        const gamesQuery = query(collection(db, "games"), orderBy("openTime", "asc"));
        const gamesSnapshot = await getDocs(gamesQuery);
        const gamesData = gamesSnapshot.docs.map(doc => doc.data().name as string);
        setGamesList(['all', ...gamesData]);

        const bidsSnapshot = await getDocs(collection(db, 'bids'));
        const bidsData = bidsSnapshot.docs.map(doc => doc.data() as Bid);
        setBids(bidsData);

      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBidsAndGames();
  }, []);
  
  useEffect(() => {
    const dataToProcess = selectedGame === 'all' ? bids : bids.filter(b => b.gameName === selectedGame);
    
    const grouped: GroupedLoad = {};
    let currentTotal = 0;

    dataToProcess.forEach(bid => {
        const { gameName, betType, session, totalAmount } = bid;
        if (!gameName || !betType || !session) return;
        
        if (!grouped[gameName]) {
            grouped[gameName] = {};
        }
        if (!grouped[gameName][betType]) {
            grouped[gameName][betType] = {};
        }
        if (!grouped[gameName][betType][session]) {
            grouped[gameName][betType][session] = 0;
        }
        
        grouped[gameName][betType][session] += totalAmount;
        currentTotal += totalAmount;
    });

    setGroupedLoad(grouped);
    setTotalLoad(currentTotal);
  }, [bids, selectedGame]);

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-bold">View All Load</CardTitle>
              <CardDescription>A detailed breakdown of the betting load across all games.</CardDescription>
            </div>
            <div className="w-full sm:w-auto sm:max-w-xs">
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                        {gamesList.map(game => (
                            <SelectItem key={game} value={game}>
                                {game === 'all' ? 'All Games' : game}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game Name</TableHead>
                    <TableHead>Bet Type</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Total Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedLoad).map(([gameName, betTypes]) => (
                    Object.entries(betTypes).map(([betType, sessions]) => (
                      Object.entries(sessions).map(([session, load]) => (
                        <TableRow key={`${gameName}-${betType}-${session}`}>
                          <TableCell>{gameName}</TableCell>
                          <TableCell>{betType}</TableCell>
                          <TableCell>{session}</TableCell>
                          <TableCell>₹{load.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ))
                  ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                        <TableCell>₹{totalLoad.toFixed(2)}</TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
          {Object.keys(groupedLoad).length === 0 && !loading && (
            <p className="text-center text-muted-foreground mt-4">
              No load data available for the selected filter.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
