
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Game extends DocumentData {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
}

interface GameContextType {
    game: Game | null;
    loading: boolean;
    now: Date;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameLayout');
    }
    return context;
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const gameId = params.gameId as string;
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    const activeBetType = useMemo(() => {
        const pathSegments = pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        switch (lastSegment) {
            case 'single-digit': return 'Single Digit';
            case 'jodi-digit': return 'Jodi Digit';
            case 'single-pana': return 'Single Pana';
            case 'double-pana': return 'Double Pana';
            case 'triple-pana': return 'Triple Pana';
            default: return 'Choose Bet Type';
        }
    }, [pathname]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000); // update time every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!gameId) return;
        setLoading(true);
        const fetchGame = async () => {
          try {
            const gameDocRef = doc(db, 'games', gameId);
            const gameDoc = await getDoc(gameDocRef);
            if (gameDoc.exists()) {
              const gameData = { id: gameDoc.id, ...gameDoc.data() } as Game;
              setGame(gameData);
            } else {
              router.push('/404');
            }
          } catch (error) {
            console.error('Error fetching game data:', error);
          } finally {
            setLoading(false);
          }
        };
        fetchGame();
    }, [gameId, router]);
    
    if (loading) {
         return (
            <div className="dark min-h-screen bg-background text-foreground p-2">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-2">
                        <Skeleton className="h-5 w-3/4 mx-auto bg-slate-700/50" />
                        <Skeleton className="h-4 w-1/2 mx-auto mt-2 bg-slate-700/50" />
                    </div>
                    <div className="my-2">
                        <Skeleton className="h-9 w-full bg-slate-700/50" />
                    </div>
                    <div className="w-full mt-4">
                        <Skeleton className="h-64 w-full bg-slate-700/50" />
                    </div>
                </div>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <p>Game not found.</p>
            </div>
        );
    }

    return (
        <GameContext.Provider value={{ game, loading, now }}>
            <div className="dark min-h-screen bg-background text-foreground p-2 pb-28">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-2">
                  <h1 className="text-base font-bold whitespace-nowrap">
                    Place Your Bet - <span className="text-primary">{game.name}</span>
                  </h1>
                   <p className="text-xs text-muted-foreground mt-1">{activeBetType}</p>
                </div>

                <div className="my-2">
                     <Button variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white h-9" onClick={() => router.replace(`/#${gameId}`)}>
                        <div className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4"/>
                            <span className="text-sm">Back to Home</span>
                        </div>
                    </Button>
                </div>
                
                <div className="w-full">
                    {children}
                </div>

              </div>
            </div>
        </GameContext.Provider>
    );
}
