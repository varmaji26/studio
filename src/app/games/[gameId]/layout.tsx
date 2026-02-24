'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GameContext, type Game } from '@/hooks/use-game';
import { useAuth } from '@/hooks/use-auth';

interface UserProfile extends DocumentData {
  balance?: number;
  bonusBalance?: number;
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const gameId = params.gameId as string;
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile>({});

    const activeBetType = useMemo(() => {
        const pathSegments = pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];

        if (lastSegment === gameId) {
            return game?.name || '';
        }

        switch (lastSegment) {
            case 'single-digit': return 'Single Digit';
            case 'jodi-digit': return 'Jodi Digit';
            case 'single-pana': return 'Single Pana';
            case 'double-pana': return 'Double Pana';
            case 'triple-pana': return 'Triple Pana';
            case 'all-pana-bulk': return 'SP DP TP';
            case 'sp-motor': return 'SP Motor';
            case 'dp-motor': return 'DP Motor';
            case 'half-sangam': return 'Half Sangam';
            case 'full-sangam': return 'Full Sangam';
            case 'single-pana-bulk': return 'Single Pana Bulk';
            case 'double-pana-bulk': return 'Double Pana Bulk';
            default: return game?.name || '';
        }
    }, [pathname, gameId, game]);

    useEffect(() => {
        if (user?.uid) {
            const userDocRef = doc(db, 'users', user.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setUserProfile(doc.data() as UserProfile);
                }
            });
            return () => unsubscribe();
        }
    }, [user?.uid]);

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
    
    const totalBalance = (userProfile?.balance || 0) + (userProfile?.bonusBalance || 0);

    if (loading) {
         return (
            <div className="dark min-h-screen bg-background text-foreground p-2">
                <div className="max-w-2xl mx-auto space-y-4">
                    <Skeleton className="h-14 w-full bg-slate-700/50" />
                    <Skeleton className="h-20 w-full bg-slate-700/50" />
                    <Skeleton className="h-64 w-full bg-slate-700/50" />
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
            <div className="dark min-h-screen bg-background text-foreground flex flex-col">
                <header className="bg-[#112a45] text-white p-2.5 grid grid-cols-[auto_1fr_auto] gap-2 items-center sticky top-0 z-10 shadow-md">
                    <div className="flex justify-start">
                        <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => router.back()}>
                            <ArrowLeft />
                        </Button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-lg font-bold uppercase whitespace-nowrap">{game.name}</h1>
                    </div>
                    <div className="flex justify-end">
                        <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                            <Wallet className="h-5 w-5" />
                            <span className="font-bold text-sm">{totalBalance.toFixed(0)}</span>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-2 pb-28">
                    <div className="max-w-2xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </GameContext.Provider>
    );
}
