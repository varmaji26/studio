
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, DocumentData, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Play } from 'lucide-react';

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
  const [gameLoads, setGameLoads] = useState<GameLoad[]>([]);
  const [liveBidding, setLiveBidding] = useState<LiveBiddingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoadData = async () => {
      setLoading(true);
      try {
        // Fetch all games sorted by openTime
        const gamesQuery = query(collection(db, "games"), orderBy("openTime", "asc"));
        const gamesSnapshot = await getDocs(gamesQuery);
        const games: Game[] = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));

        // Fetch all bids for the 'Open' session
        const bidsQuery = query(collection(db, 'bids'), where('session', '==', 'Open'));
        const bidsSnapshot = await getDocs(bidsQuery);
        const bids: Bid[] = bidsSnapshot.docs.map(doc => doc.data() as Bid);

        // Calculate total load for each game
        const loadData: GameLoad[] = games.map(game => {
          const gameBids = bids.filter(bid => bid.gameId === game.id);
          const totalLoad = gameBids.reduce((acc, bid) => acc + bid.totalAmount, 0);
          return { id: game.id, name: game.name, totalLoad };
        });
        setGameLoads(loadData);
        
        // --- Placeholder for Live Bidding Details ---
        // As per the image, we will show MORNING SRIDEVI - Open Single Digit by default.
        // In a future update, this can be made dynamic based on user selection.
        const srideviGame = games.find(g => g.name.toUpperCase() === 'MORNING SRIDEVI' || g.name.toUpperCase() === 'SRIDEVI');
        if (srideviGame) {
            const srideviBids = bids.filter(b => b.gameId === srideviGame.id && b.betType === 'Single Digit');
            const totalLoadOnSrideviSingleDigit = srideviBids.reduce((acc, bid) => acc + bid.totalAmount, 0);

            const numberLoads: { [key: string]: number } = {};
            for (let i = 0; i < 10; i++) {
                numberLoads[i.toString()] = 0;
            }

            srideviBids.forEach(bid => {
                const amountPerNumber = bid.totalAmount / bid.numbers.length;
                bid.numbers.forEach(num => {
                    if (numberLoads[num] !== undefined) {
                        numberLoads[num] += amountPerNumber;
                    }
                });
            });

            setLiveBidding({
                gameName: srideviGame.name,
                betType: 'Open Single Digit',
                totalLoad: totalLoadOnSrideviSingleDigit,
                numberLoads,
            });
        }
        // --- End of Placeholder ---

      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoadData();
  }, []);

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
            <CardTitle className="text-3xl font-bold">View Open Load</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {gameLoads.map((game) => (
                <Card key={game.id} className="bg-slate-800/60 border-slate-700 shadow-md transform hover:scale-105 transition-transform duration-300">
                    <CardContent className="p-4 text-center">
                        <div className="flex justify-end">
                            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{game.name.toUpperCase()}</h3>
                        <p className="text-xl font-semibold text-primary mt-2">₹{game.totalLoad.toFixed(2)} /-</p>
                        <div className="flex justify-center mt-3">
                           <button className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
                             <Play className="h-5 w-5" />
                           </button>
                        </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {liveBidding && (
          <Card className="bg-card/80 border-white/10 shadow-lg mt-8">
            <CardHeader>
                <CardTitle>Live Bidding - {liveBidding.gameName} - {liveBidding.betType} - Total Load ₹{liveBidding.totalLoad.toFixed(2)}</CardTitle>
            </CardHeader>
             <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4">
                    {Object.entries(liveBidding.numberLoads).map(([number, load]) => (
                        <div key={number} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-center">
                            <p className="font-bold text-lg text-white">{number}==</p>
                            <p className="text-md text-primary">₹{load.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
      )}

    </div>
  );
}
