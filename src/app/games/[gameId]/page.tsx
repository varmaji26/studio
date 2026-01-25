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
import React from 'react';


interface Game extends DocumentData {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
}

const SingleDigitIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.80005 17.5V30.5C4.80005 32.7091 6.59091 34.5 8.80005 34.5H21.8L33.8 22.5V9.5C33.8 7.29086 32.0092 5.5 29.8 5.5H16.8L4.80005 17.5Z" fill="#3F3F3F" fillOpacity="0.8"/>
        <path d="M21.8 34.5H34.8C37.0092 34.5 38.8 32.7091 38.8 30.5V17.5L21.8 34.5Z" fill="#2F2F2F" fillOpacity="0.8"/>
        <path d="M43.2 22.5L33.8 31.5V9.5L43.2 22.5Z" fill="#2F2F2F" fillOpacity="0.8"/>
        <circle cx="25" cy="15" r="2" fill="white"/>
        <circle cx="15" cy="25" r="2" fill="white"/>
        <circle cx="10" cy="20" r="1.5" fill="white"/>
        <circle cx="20" cy="30" r="1.5" fill="white"/>
        <circle cx="30" cy="25" r="1.5" fill="white"/>
    </svg>
);

const JodiDigitIcon = () => (
    <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(15, 0) scale(0.9)">
            <path d="M9.8 17.5V30.5C9.8 32.7091 11.5909 34.5 13.8 34.5H26.8L38.8 22.5V9.5C38.8 7.29086 37.0092 5.5 34.8 5.5H21.8L9.8 17.5Z" fill="#FFFFFF" fillOpacity="0.9"/>
            <path d="M26.8 34.5H39.8C42.0092 34.5 43.8 32.7091 43.8 30.5V17.5L26.8 34.5Z" fill="#E0E0E0" fillOpacity="0.9"/>
            <path d="M48.2 22.5L38.8 31.5V9.5L48.2 22.5Z" fill="#E0E0E0" fillOpacity="0.9"/>
            <circle cx="30" cy="15" r="2" fill="#3F3F3F"/>
            <circle cx="20" cy="25" r="2" fill="#3F3F3F"/>
        </g>
        <g transform="translate(0, 5) scale(0.9)">
            <path d="M9.8 17.5V30.5C9.8 32.7091 11.5909 34.5 13.8 34.5H26.8L38.8 22.5V9.5C38.8 7.29086 37.0092 5.5 34.8 5.5H21.8L9.8 17.5Z" fill="#3F3F3F" fillOpacity="0.8"/>
            <path d="M26.8 34.5H39.8C42.0092 34.5 43.8 32.7091 43.8 30.5V17.5L26.8 34.5Z" fill="#2F2F2F" fillOpacity="0.8"/>
            <path d="M48.2 22.5L38.8 31.5V9.5L48.2 22.5Z" fill="#2F2F2F" fillOpacity="0.8"/>
            <circle cx="30" cy="15" r="2" fill="white"/>
            <circle cx="20" cy="25" r="2" fill="white"/>
            <circle cx="15" cy="20" r="1.5" fill="white"/>
            <circle cx="25" cy="30" r="1.5" fill="white"/>
            <circle cx="35" cy="25" r="1.5" fill="white"/>
        </g>
    </svg>
);

const SinglePanaIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_1_2)"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_1_2)"/>
        <defs>
            <linearGradient id="paint0_linear_1_2" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FBCFE8"/>
                <stop offset="1" stopColor="#E879F9"/>
            </linearGradient>
            <linearGradient id="paint1_linear_1_2" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FBCFE8"/>
                <stop offset="1" stopColor="#E879F9"/>
            </linearGradient>
        </defs>
    </svg>
);

const DoublePanaIcon = () => (
     <svg width="48" height="48" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(8, 8) scale(0.8)" style={{opacity: 0.6}}>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_2_2_double)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_2_2_double)"/>
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_2_2_main)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_2_2_main)"/>
        </g>
        <defs>
            <linearGradient id="paint0_linear_2_2_double" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint1_linear_2_2_double" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint0_linear_2_2_main" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint1_linear_2_2_main" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
        </defs>
    </svg>
);

const TriplePanaIcon = () => (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(16, 16) scale(0.7)" style={{opacity: 0.5}}>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_3_2_triple2)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_3_2_triple2)"/>
        </g>
        <g transform="translate(8, 8) scale(0.8)" style={{opacity: 0.7}}>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_3_2_triple1)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_3_2_triple1)"/>
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_3_2_main)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_3_2_main)"/>
        </g>
        <defs>
            <linearGradient id="paint0_linear_3_2_triple2" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint1_linear_3_2_triple2" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint0_linear_3_2_triple1" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint1_linear_3_2_triple1" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint0_linear_3_2_main" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
            <linearGradient id="paint1_linear_3_2_main" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#FBCFE8"/><stop offset="1" stopColor="#E879F9"/></linearGradient>
        </defs>
    </svg>
);


const betTypes = [
    { title: 'Single Digit', href: (gameId: string) => `/games/${gameId}/single-digit`, icon: <SingleDigitIcon />, gradient: 'bg-gradient-to-br from-blue-400 to-blue-600' },
    { title: 'Jodi Digit', href: (gameId: string) => `/games/${gameId}/jodi-digit`, icon: <JodiDigitIcon />, gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600' },
    { title: 'Single Pana', href: (gameId: string) => `/games/${gameId}/single-pana`, icon: <SinglePanaIcon />, gradient: 'bg-gradient-to-br from-slate-700 to-slate-900' },
    { title: 'Double Pana', href: (gameId: string) => `/games/${gameId}/double-pana`, icon: <DoublePanaIcon />, gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
    { title: 'Triple Pana', href: (gameId: string) => `/games/${gameId}/triple-pana`, icon: <TriplePanaIcon />, gradient: 'bg-gradient-to-br from-rose-500 to-red-600' },
];

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingBetType, setAnimatingBetType] = useState<string | null>(null);

  useEffect(() => {
    if (typeof gameId !== 'string') {
        setLoading(false);
        return;
    };

    const fetchGame = async () => {
      try {
        const gameDocRef = doc(db, 'games', gameId);
        const gameDoc = await getDoc(gameDocRef);

        if (gameDoc.exists()) {
          setGame({ id: gameDoc.id, ...gameDoc.data() } as Game);
        } else {
          console.error('No such document!');
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

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
  
  const BetTypeItem = ({ betType }: { betType: (typeof betTypes)[0] }) => (
    <div
      onClick={() => handleBetTypeClick(betType.title)}
      className={cn(
        "rounded-lg p-2 text-white text-center flex flex-col items-center justify-between h-32",
        "transition-all duration-300 transform hover:scale-105",
        betType.gradient,
        animatingBetType === betType.title && 'animate-pulse-once'
      )}
    >
      <div className="flex-grow flex items-center justify-center">
        {betType.icon}
      </div>
      <p className="font-bold text-base">{betType.title}</p>
    </div>
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground p-2">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold">
            Place Your Bet - <span className="text-primary bg-primary/20 px-2 rounded-md">{game.name}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}
          </p>
           <p className="text-muted-foreground mt-1 text-xs">
            Choose a bet type to start placing your bids.
          </p>
        </div>
        
        <div className="my-2">
            <Button variant="default" className="w-full bg-green-500 hover:bg-green-600 text-white h-9" onClick={() => router.replace(`/#${gameId}`)}>
                <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4"/>
                    <span className="text-sm">Back to Home</span>
                </div>
            </Button>
        </div>

        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader className="p-4">
                <CardTitle className="text-2xl text-center">Choose a Bet Type</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 p-2">
               {betTypes.map((betType) => {
                  if (betType.href) {
                    return (
                      <Link key={betType.title} href={betType.href(game.id as string)}>
                        <BetTypeItem betType={betType} />
                      </Link>
                    );
                  }
                  return (
                    <div key={betType.title}>
                      <BetTypeItem betType={betType} />
                    </div>
                  );
               })}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
