
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function ViewGameTypeLoadPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [allBids, setAllBids] = useState<Bid[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [betTypeLoadDetails, setBetTypeLoadDetails] = useState<BetTypeLoadDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const bidsQuery = query(
        collection(db, 'bids'), 
        where('createdAt', '>=', startOfToday)
    );

    const unsubscribe = onSnapshot(bidsQuery, (bidsSnapshot) => {
      const bidsData: Bid[] = bidsSnapshot.docs.map(doc => doc.data() as Bid);
      setAllBids(bidsData);
    }, (error) => {
        console.error("Error fetching today's bids: ", error);
    });
    return () => unsubscribe();
  }, []);
  
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


  return (
    <div className="flex-1 space-y-6">
      <div className="grid gap-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
              <CardTitle className="text-3xl font-bold">View Game-Type wise Load (Today)</CardTitle>
              <CardDescription>Select a game to see its live bidding details for each bet type for today.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <Loader className="h-8 w-8 text-primary" />
              </div>
            ) : (
                <div className="w-full max-w-sm">
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
            )}
          </CardContent>
        </Card>

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
                    <p className="text-center text-muted-foreground p-8">No bidding has occurred for this game today.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
