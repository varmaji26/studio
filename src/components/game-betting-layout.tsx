
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

const betTypes = [
    { title: 'Single Digit', href: (gameId: string) => `/games/${gameId}/single-digit` },
];

export function GameBettingLayout({ gameName, gameId, activeBetType, children }: GameBettingLayoutProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">
            Place Your Bet - <span className="text-primary">{gameName}</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-1">{activeBetType}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left Column - Bet Types */}
            <div className="md:col-span-1 space-y-4">
                <Card className="bg-card/80 border-white/10">
                    <CardHeader>
                        <CardTitle>Bet Types</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {betTypes.map((bet) => {
                             const isClickable = bet.href !== '#';
                             const isActive = bet.title === activeBetType;

                             return (
                                <Link key={bet.title} href={isClickable ? bet.href(gameId) : '#'} passHref>
                                    <Button
                                        variant={isActive ? "default" : "outline"}
                                        className={cn(
                                            "w-full justify-start",
                                            !isClickable && "cursor-not-allowed opacity-50"
                                        )}
                                        disabled={!isClickable}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        {bet.title}
                                    </Button>
                                </Link>
                             )
                        })}
                    </CardContent>
                </Card>

                 <Button asChild variant="outline" className="w-full">
                    <Link href={`/games/${gameId}`} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4"/>
                        <span>Back to Options</span>
                    </Link>
                </Button>
            </div>

            {/* Right Column - Betting Form */}
            <div className="md:col-span-3">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
}
