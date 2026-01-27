'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameBettingLayoutProps {
  gameName: string;
  gameId: string;
  activeBetType: string;
  children: React.ReactNode;
}

export function GameBettingLayout({ gameName, gameId, activeBetType, children }: GameBettingLayoutProps) {
  const router = useRouter();

  return (
    <div className="dark min-h-screen bg-background text-foreground p-2 pb-28">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-2">
          <h1 className="text-base font-bold whitespace-nowrap">
            Place Your Bet - <span className="text-primary">{gameName}</span>
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
  );
}
