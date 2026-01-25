'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, orderBy, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Play, Download, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

interface Game extends DocumentData {
    id: string;
    name: string;
}

interface Bid extends DocumentData {
    gameId: string;
    betType: string;
    numbers: string[];
    totalAmount: number;
}

interface GameLoad {
    id: string;
    name: string;
    totalLoad: number;
}

interface BetTypeLoadDetails {
    gameName: string;
    betType: string;
    totalLoad: number;
    numberLoads: { [key: string]: number };
}

// Extend jsPDF with autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ViewGameTypeLoadPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [allBids, setAllBids] = useState<Bid[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [betTypeLoadDetails, setBetTypeLoadDetails] = useState<BetTypeLoadDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      const gamesQuery = query(collection(db, "games"), orderBy("openTime", "asc"));
      const gamesSnapshot = await getDocs(gamesQuery);
      const gamesData: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      if (gamesData.length > 0) {
        setSelectedGameId(gamesData[0].id);
      }
      setLoading(false);
    };
    fetchGames();
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;

    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bidsQuery = query(
        collection(db, 'bids'), 
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay))
    );

    const unsubscribe = onSnapshot(bidsQuery, (bidsSnapshot) => {
      const bidsData: Bid[] = bidsSnapshot.docs.map(doc => doc.data() as Bid);
      setAllBids(bidsData);
    }, (error) => {
        console.error("Error fetching bids for date range: ", error);
    });
    return () => unsubscribe();
  }, [fromDate, toDate]);
  
  useEffect(() => {
      if (!selectedGameId) {
          setBetTypeLoadDetails([]);
          return;
      }
      
      const selectedGame = games.find(g => g.id === selectedGameId);
      if (!selectedGame) return;

      const gameBids = allBids.filter(bid => bid.gameId === selectedGameId);

      const betTypes = ['Single Digit', 'Jodi Digit', 'Single Pana', 'Double Pana', 'Triple Pana'];
      
      const details = betTypes.map(betType => {
          const typeBids = gameBids.filter(b => b.betType === betType);
          const totalLoad = typeBids.reduce((acc, bid) => acc + bid.totalAmount, 0);
          
          const numberLoads: { [key: string]: number } = {};
          typeBids.forEach(bid => {
              const amountPerNumber = bid.totalAmount / bid.numbers.length;
              bid.numbers.forEach(num => {
                  numberLoads[num] = (numberLoads[num] || 0) + amountPerNumber;
              });
          });

          return {
              gameName: selectedGame.name,
              betType,
              totalLoad,
              numberLoads
          };
      });

      setBetTypeLoadDetails(details);

  }, [selectedGameId, allBids, games]);

  const handleDownloadPDF = () => {
    if (!selectedGameId) return;
    const selectedGame = games.find(g => g.id === selectedGameId);
    if (!selectedGame) return;

    const doc = new jsPDF();
    const dateRange = fromDate && toDate ? `${format(fromDate, "PPP")} to ${format(toDate, "PPP")}` : "All Time";
    doc.text(`Game-Type Load Report for ${selectedGame.name} - ${dateRange}`, 14, 16);
    
    let startY = 24;

    betTypeLoadDetails.forEach(details => {
        if (details.totalLoad > 0) {
            doc.autoTable({
                head: [[`${details.betType} - Total Load: ${details.totalLoad.toFixed(2)} INR`]],
                body: [],
                startY: startY,
                headStyles: { fillColor: [22, 163, 74] }
            });

            const tableColumn = ["Number", "Load (INR)"];
            const tableRows: (string | number)[][] = Object.entries(details.numberLoads)
              .sort(([numA], [numB]) => numA.localeCompare(numB, undefined, { numeric: true }))
              .map(([number, load]) => [number, load.toFixed(2)]);
              
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: (doc.autoTable as any).previous.finalY + 2,
                theme: 'grid'
            });

            startY = (doc.autoTable as any).previous.finalY + 10;
        }
    });

    if (startY === 24) { // No data was added
        doc.text(`No bidding has occurred for this game in the selected date range.`, 14, 24);
    }
    
    doc.save(`gametype-load-report-${selectedGame.name.toLowerCase().replace(/\s/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };


  return (
    <div className="flex-1 space-y-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
              <h1 className="text-3xl font-bold">View Game-Type wise Load</h1>
              <p className="text-muted-foreground">Select a game and date range to see its live bidding details for each bet type.</p>
           </div>
           <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={!selectedGameId || betTypeLoadDetails.every(d => d.totalLoad === 0)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
          </Button>
        </div>
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-auto sm:max-w-xs">
                      <Label>Select Game</Label>
                      <Select
                          value={selectedGameId || ''}
                          onValueChange={(value) => setSelectedGameId(value)}
                      >
                          <SelectTrigger>
                              <SelectValue placeholder="Select a game" />
                          </SelectTrigger>
                          <SelectContent>
                              {games.map((game) => (
                                  <SelectItem key={game.id} value={game.id}>
                                      {game.name}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="flex flex-col sm:flex-row items-end gap-2">
                       <div>
                          <Label htmlFor="from-date" className="text-sm">From Date</Label>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button
                                  id="from-date"
                                  variant={"outline"}
                                  className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !fromDate && "text-muted-foreground"
                                  )}
                                  >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {fromDate ? format(fromDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar
                                  mode="single"
                                  selected={fromDate}
                                  onSelect={setFromDate}
                                  initialFocus
                                  />
                              </PopoverContent>
                          </Popover>
                       </div>
                       <div>
                          <Label htmlFor="to-date" className="text-sm">To Date</Label>
                           <Popover>
                              <PopoverTrigger asChild>
                                  <Button
                                  id="to-date"
                                  variant={"outline"}
                                  className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !toDate && "text-muted-foreground"
                                  )}
                                  >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {toDate ? format(toDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
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
              </div>
          )}
        </div>

        {betTypeLoadDetails.map((details) => (
            (details.totalLoad > 0) && (
            <Card key={details.betType} className="bg-card/80 border-white/10 shadow-lg">
              <CardHeader>
                  <CardTitle>{details.gameName} - {details.betType} - Total Load ₹{details.totalLoad.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className={cn(
                      "grid gap-4",
                      details.betType === 'Single Digit' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10' :
                      'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                  )}>
                      {Object.entries(details.numberLoads)
                          .sort(([numA], [numB]) => numA.localeCompare(numB, undefined, { numeric: true }))
                          .map(([number, load]) => (
                          <div key={number} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center">
                              <p className="font-bold text-lg text-white">{number}==</p>
                              <p className="text-md text-primary">₹{load.toFixed(2)}</p>
                          </div>
                      ))}
                  </div>
              </CardContent>
            </Card>
            )
        ))}
        {!loading && betTypeLoadDetails.every(d => d.totalLoad === 0) && (
             <Card className="bg-card/80 border-white/10 shadow-lg">
                <CardContent>
                    <p className="text-center text-muted-foreground p-8">No bidding has occurred for this game in the selected date range.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
