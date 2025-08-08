
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader } from '@/components/loader';

interface Game extends DocumentData {
    id: string;
    name: string;
}

interface Bid extends DocumentData {
    gameId: string;
    totalAmount: number;
    winningAmount?: number;
    status: 'running' | 'won' | 'lost';
}

interface MarketData {
    gameName: string;
    load: number;
    distribution: number;
    profitLoss: number;
}

export default function MarketLoadPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMarketLoad = async () => {
      setLoading(true);
      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'));
        const games: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));

        const bidsSnapshot = await getDocs(collection(db, 'bids'));
        const bids: Bid[] = bidsSnapshot.docs.map(doc => doc.data() as Bid);

        const data: MarketData[] = games.map(game => {
          const gameBids = bids.filter(bid => bid.gameId === game.id);
          
          const load = gameBids.reduce((acc, bid) => acc + (bid.totalAmount || 0), 0);
          
          const distribution = gameBids
            .filter(bid => bid.status === 'won')
            .reduce((acc, bid) => acc + (bid.winningAmount || 0), 0);
            
          const profitLoss = load - distribution;

          return {
            gameName: game.name,
            load,
            distribution,
            profitLoss,
          };
        });

        setMarketData(data);
      } catch (error) {
        console.error("Error calculating market load: ", error);
      } finally {
        setLoading(false);
      }
    };

    calculateMarketLoad();
  }, []);

  const totalLoad = marketData.reduce((acc, market) => acc + market.load, 0);
  const totalDistribution = marketData.reduce((acc, market) => acc + market.distribution, 0);
  const totalProfitLoss = marketData.reduce((acc, market) => acc + market.profitLoss, 0);

  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Market-wise Load & Distribution</CardTitle>
          <CardDescription>An overview of the load, distribution, and profit/loss for each market.</CardDescription>
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
                    <TableHead>NAME</TableHead>
                    <TableHead>LOAD</TableHead>
                    <TableHead>DISTRIBUTION</TableHead>
                    <TableHead>PROFIT/LOSS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData.map((market) => (
                    <TableRow key={market.gameName}>
                      <TableCell>{market.gameName}</TableCell>
                      <TableCell>₹{market.load.toFixed(2)}</TableCell>
                      <TableCell>₹{market.distribution.toFixed(2)}</TableCell>
                      <TableCell className={market.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                        ₹{market.profitLoss.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell>₹{totalLoad.toFixed(2)}</TableCell>
                        <TableCell>₹{totalDistribution.toFixed(2)}</TableCell>
                        <TableCell className={totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ₹{totalProfitLoss.toFixed(2)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
          {marketData.length === 0 && !loading && (
            <p className="text-center text-muted-foreground mt-4">
              No market data available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
