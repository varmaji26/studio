
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

interface Game extends DocumentData {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
}

const betTypes = [
    { title: 'Single Digit', description: 'Bet on a single digit from 0-9.' },
    { title: 'Jodi Digit', description: 'Bet on a two-digit pair from 00-99.' },
    { title: 'Single Pana', description: 'Bet on a three-digit single pana.' },
    { title: 'Double Pana', description: 'Bet on a three-digit double pana.' },
    { title: 'Triple Pana', description: 'Bet on a three-digit triple pana.' },
];

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { gameId } = params;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

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
            Open: {game.openTime} | Close: {game.closeTime}
          </p>
           <p className="text-muted-foreground mt-1">
            Choose a bet type to start placing your bids.
          </p>
        </div>
        
        <div className="my-6">
            <Button asChild variant="outline" className="w-full">
                <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4"/>
                    <span>Back to Home</span>
                </Link>
            </Button>
        </div>

        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-center">Choose a Bet Type</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {betTypes.map((betType) => (
                    <button key={betType.title} className="text-left w-full">
                        <Card className="bg-slate-800/80 border-slate-700 hover:border-primary hover:bg-primary/10 transition-all">
                            <CardHeader>
                                <CardTitle className="text-primary">{betType.title}</CardTitle>
                                <CardDescription>{betType.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </button>
               ))}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
