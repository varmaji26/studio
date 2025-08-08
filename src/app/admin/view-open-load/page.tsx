
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Game extends DocumentData {
    id: string;
    name: string;
}

interface Bid extends DocumentData {
    gameId: string;
    betType: string;
    session: string;
    numbers: string[];
    totalAmount: number;
}

interface GameLoad {
    id: string;
    name: string;
    totalLoad: number;
}

interface LiveBiddingDetails {
    gameName: string;
    betType: string;
    totalLoad: number;
    numberLoads: { [key: string]: number };
}

export default function ViewOpenLoadPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [allOpenBids, setAllOpenBids] = useState<Bid[]>([]);
  const [gameLoads, setGameLoads] = useState<GameLoad[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [liveBiddingDetails, setLiveBiddingDetails] = useState<LiveBiddingDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch games once
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      const gamesQuery = query(collection(db, "games"), orderBy("openTime", "asc"));
      const gamesSnapshot = await getDocs(gamesQuery);
      const gamesData: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
      setGames(gamesData);
      if (gamesData.length > 0) {
        setSelectedGame(gamesData[0]); // Select the first game by default
      }
      setLoading(false);
    };
    fetchGames();
  }, []);

  // Listen for real-time bid updates for the current day
  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const bidsQuery = query(
        collection(db, 'bids'), 
        where('createdAt', '>=', startOfToday)
    );

    const unsubscribe = onSnapshot(bidsQuery, (bidsSnapshot) => {
      const bidsData: Bid[] = bidsSnapshot.docs.map(doc => doc.data() as Bid);
      const openBids = bidsData.filter(bid => bid.session === 'Open');
      setAllOpenBids(openBids);
    }, (error) => {
        console.error("Error fetching today's open bids: ", error);
        // This might indicate a missing Firestore index.
    });
    return () => unsubscribe();
  }, []);

  // Recalculate loads when games or bids change
  useEffect(() => {
    if (games.length === 0) return;

    const loadData: GameLoad[] = games.map(game => {
      const gameBids = allOpenBids.filter(bid => bid.gameId === game.id);
      const totalLoad = gameBids.reduce((acc, bid) => acc + bid.totalAmount, 0);
      return { id: game.id, name: game.name, totalLoad };
    });
    setGameLoads(loadData);

  }, [games, allOpenBids]);
  
  // Recalculate live bidding details when selected game or bids change
  useEffect(() => {
      if (!selectedGame) {
          setLiveBiddingDetails([]);
          return;
      }

      const gameBids = allOpenBids.filter(bid => bid.gameId === selectedGame.id);

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

      setLiveBiddingDetails(details);

  }, [selectedGame, allOpenBids]);


  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="grid gap-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
              <CardTitle className="text-3xl font-bold">View Open Load (Today)</CardTitle>
              <CardDescription>Click on a game to see its live bidding details for today's Open session below.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader className="h-8 w-8 text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {gameLoads.map((game) => (
                  <button 
                      key={game.id} 
                      onClick={() => setSelectedGame(game)}
                      className={cn(
                          "text-left rounded-lg transform hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-primary",
                          selectedGame?.id === game.id ? "ring-2 ring-primary" : ""
                      )}
                  >
                      <Card className="bg-slate-800/60 border-slate-700 shadow-md h-full">
                          <CardContent className="p-4 text-center">
                              <div className="flex justify-end">
                                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                              <h3 className="text-lg font-bold text-white truncate">{game.name.toUpperCase()}</h3>
                              <p className="text-xl font-semibold text-primary mt-2">₹{game.totalLoad.toFixed(2)} /-</p>
                              <div className="flex justify-center mt-3">
                                  <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
                                      <Play className="h-5 w-5" />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedGame && liveBiddingDetails.map((details) => (
            (details.totalLoad > 0) && (
            <Card key={details.betType} className="bg-card/80 border-white/10 shadow-lg">
              <CardHeader>
                  <CardTitle>Live Bidding - {details.gameName} - Open {details.betType} - Total Load ₹{details.totalLoad.toFixed(2)}</CardTitle>
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
      </div>
    </div>
  );
}
