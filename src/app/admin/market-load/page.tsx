
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


interface Game extends DocumentData {
    id: string;
    name: string;
}

interface Bid extends DocumentData {
    gameId: string;
    totalAmount: number;
    winningAmount?: number;
    status: 'running' | 'won' | 'lost';
    createdAt: Timestamp;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const calculateMarketLoad = async () => {
      if (!selectedDate) return;

      setLoading(true);
      try {
        const gamesSnapshot = await getDocs(collection(db, 'games'));
        const games: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const bidsQuery = query(
            collection(db, 'bids'),
            where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
            where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );

        const bidsSnapshot = await getDocs(bidsQuery);
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
  }, [selectedDate]);

  const totalLoad = marketData.reduce((acc, market) => acc + market.load, 0);
  const totalDistribution = marketData.reduce((acc, market) => acc + market.distribution, 0);
  const totalProfitLoss = marketData.reduce((acc, market) => acc + market.profitLoss, 0);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const reportDate = selectedDate ? format(selectedDate, "PPP") : 'All Time';
    doc.text(`Market-wise Load & Distribution - ${reportDate}`, 14, 16);

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
        startY: 24,
        styles: { halign: 'center' },
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fillColor: [211, 211, 211], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`market-load-report-${selectedDate ? format(selectedDate, "yyyy-MM-dd") : 'all-time'}.pdf`);
  };

  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="text-3xl font-bold">Market-wise Load & Distribution</CardTitle>
                    <CardDescription>
                        An overview of the load, distribution, and profit/loss for each market for{' '}
                        <span className="font-bold text-primary">{selectedDate ? format(selectedDate, "PPP") : 'all time'}</span>.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[280px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
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
                    <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={marketData.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                    </Button>
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
              No market data available for the selected date.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
