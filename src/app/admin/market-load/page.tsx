
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

// Extend jsPDF with autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Market-wise Load & Distribution", 14, 16);

    const tableColumn = ["NAME", "LOAD", "DISTRIBUTION", "PROFIT/LOSS"];
    const tableRows: (string | number)[][] = [];

    marketData.forEach(market => {
        const marketRow = [
            market.gameName,
            `₹${market.load.toFixed(2)}`,
            `₹${market.distribution.toFixed(2)}`,
            `₹${market.profitLoss.toFixed(2)}`
        ];
        tableRows.push(marketRow);
    });
    
    // Add total row
    const totalRow = [
        'Total',
        `₹${totalLoad.toFixed(2)}`,
        `₹${totalDistribution.toFixed(2)}`,
        `₹${totalProfitLoss.toFixed(2)}`
    ];

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        foot: [totalRow],
        startY: 20,
        didDrawPage: (data) => {
            // Header
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text("Market Report", data.settings.margin.left, 15);
        },
        styles: {
            halign: 'center'
        },
        headStyles: {
            fillColor: [22, 163, 74]
        },
        footStyles: {
            fillColor: [211, 211, 211],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
        }
    });

    doc.save('market-load-report.pdf');
  };

  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-3xl font-bold">Market-wise Load & Distribution</CardTitle>
                    <CardDescription>An overview of the load, distribution, and profit/loss for each market.</CardDescription>
                </div>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={marketData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                </Button>
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
