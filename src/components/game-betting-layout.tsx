
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GameBettingLayoutProps {
  gameName: string;
  gameId: string;
  activeBetType: string;
  children: React.ReactNode;
}

export function GameBettingLayout({ gameName, gameId, activeBetType, children }: GameBettingLayoutProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            Place Your Bet - <span className="text-primary">{gameName}</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-1">{activeBetType}</p>
        </div>

        <div className="my-6">
            <Button asChild variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white">
                <Link href={`/games/${gameId}`} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4"/>
                    <span>Back to Game Options</span>
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
