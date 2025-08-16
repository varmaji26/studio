
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface GameBettingLayoutProps {
  gameName: string;
  gameId: string;
  activeBetType: string;
  children: React.ReactNode;
}

export function GameBettingLayout({ gameName, gameId, activeBetType, children }: GameBettingLayoutProps) {
  const router = useRouter();

  return (
    <div className="dark min-h-screen bg-background text-foreground p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">
            Place Your Bet - <span className="text-primary">{gameName}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">{activeBetType}</p>
        </div>

        <div className="my-4">
             <Button asChild variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white">
                <Link href={`/games/${gameId}`}>
                    <div className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4"/>
                        <span>Back to Game</span>
                    </div>
                </Link>
            </Button>
        </div>
        
        <div className="w-full">
            {children}
        </div>

      </div>
    </div>
  );
}
