
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime, cn } from '@/lib/utils';

interface Game extends DocumentData {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
}

const betTypes = [
    { title: 'Single Digit', href: (gameId: string) => `/games/${gameId}/single-digit` },
    { title: 'Jodi Digit', href: (gameId: string) => `/games/${gameId}/jodi-digit` },
    { title: 'Single Pana', href: (gameId: string) => `/games/${gameId}/single-pana` },
    { title: 'Double Pana', href: (gameId: string) => `/games/${gameId}/double-pana` },
    { title: 'Triple Pana', href: (gameId: string) => `/games/${gameId}/triple-pana` },
];

export default function GamePage() {
  const router = useRouter();
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingBetType, setAnimatingBetType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof gameId !== 'string') return;

    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);

        if (gameDoc.exists()) {
          setGame({ id: gameDoc.id, ...gameDoc.data() } as Game);
        } else {
          console.error('No such document!');
          // Optionally, redirect to a 404 page
          // router.push('/404');
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, router]);

  const handleBetTypeClick = (betTypeTitle: string) => {
    setAnimatingBetType(betTypeTitle);
    setTimeout(() => {
        setAnimatingBetType(null);
    }, 500); // Duration of the animation
  };

  if (loading) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
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
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold">
            Place Your Bet - <span className="text-primary bg-primary/20 px-2 rounded-md">{game.name}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}
          </p>
           <p className="text-muted-foreground mt-1">
            Choose a bet type to start placing your bids.
          </p>
        </div>
        
        <div className="my-6">
            <Button variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white" onClick={() => router.back()}>
                <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4"/>
                    <span>Back to Home</span>
                </div>
            </Button>
        </div>

        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-center">Choose a Bet Type</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {betTypes.map((betType) => {
                  const isClickable = !!betType.href;
                  const Wrapper = isClickable ? Link : 'div';
                  const props = isClickable ? { href: betType.href(game.id as string) } : {};

                  return (
                    <Wrapper key={betType.title} {...props} onClick={() => handleBetTypeClick(betType.title)}>
                      <Card className={cn(
                        "bg-slate-800/80 border-slate-700 h-full flex items-center justify-center",
                        isClickable ? 'hover:border-primary hover:bg-primary/10 transition-all cursor-pointer' : 'cursor-not-allowed opacity-50',
                        animatingBetType === betType.title && 'animate-pulse-once'
                        )}>
                          <CardHeader>
                              <CardTitle className="text-primary text-center">{betType.title}</CardTitle>
                          </CardHeader>
                      </Card>
                    </Wrapper>
                  )
               })}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
