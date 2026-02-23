'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useGame } from '@/hooks/use-game';

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

const SinglePanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_bulk_1)"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_bulk_1)"/>
        <rect x="29" y="26" width="10" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <rect x="29" y="30" width="10" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <rect x="29" y="34" width="6" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <defs>
            <linearGradient id="paint0_linear_bulk_1" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A78BFA"/>
                <stop offset="1" stopColor="#7C3AED"/>
            </linearGradient>
            <linearGradient id="paint1_linear_bulk_1" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A78BFA"/>
                <stop offset="1" stopColor="#7C3AED"/>
            </linearGradient>
        </defs>
    </svg>
);

const DoublePanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(8, 8) scale(0.8)" style={{opacity: 0.6}}>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_bulk_2)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_bulk_2)"/>
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_bulk_2_main)"/>
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_bulk_2_main)"/>
        </g>
        <rect x="29" y="26" width="10" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <rect x="29" y="30" width="10" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <rect x="29" y="34" width="6" height="2" rx="1" fill="white" fillOpacity="0.8"/>
        <defs>
            <linearGradient id="paint0_linear_bulk_2" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#818CF8"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
            <linearGradient id="paint1_linear_bulk_2" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#818CF8"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
            <linearGradient id="paint0_linear_bulk_2_main" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#818CF8"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
            <linearGradient id="paint1_linear_bulk_2_main" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#818CF8"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
        </defs>
    </svg>
);

const HalfSangamIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37V4Z" fill="url(#paint0_linear_half_sangam)"/>
        <path d="M24 4C29.5 12 37 17.5 37 24C37 31.1797 31.1797 37 24 37V4Z" stroke="url(#paint1_linear_half_sangam)" strokeWidth="2"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint2_linear_half_sangam)"/>
        <defs>
            <linearGradient id="paint0_linear_half_sangam" x1="17.5" y1="4" x2="17.5" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#6EE7B7"/><stop offset="1" stopColor="#10B981"/></linearGradient>
            <linearGradient id="paint1_linear_half_sangam" x1="30.5" y1="4" x2="30.5" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#6EE7B7"/><stop offset="1" stopColor="#10B981"/></linearGradient>
            <linearGradient id="paint2_linear_half_sangam" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#6EE7B7"/><stop offset="1" stopColor="#10B981"/></linearGradient>
        </defs>
    </svg>
);

const FullSangamIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" fill="url(#paint0_linear_full_sangam)"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="url(#paint1_linear_full_sangam)"/>
        <defs>
            <linearGradient id="paint0_linear_full_sangam" x1="24" y1="4" x2="24" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#F87171"/><stop offset="1" stopColor="#DC2626"/></linearGradient>
            <linearGradient id="paint1_linear_full_sangam" x1="24" y1="36" x2="24" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#F87171"/><stop offset="1" stopColor="#DC2626"/></linearGradient>
        </defs>
    </svg>
);

const AllPanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#3B82F6"/>
        <circle cx="12" cy="6" r="1.5" fill="white"/>
        <circle cx="17" cy="9" r="1.5" fill="white"/>
        <circle cx="17" cy="15" r="1.5" fill="white"/>
        <circle cx="12" cy="18" r="1.5" fill="white"/>
        <circle cx="7" cy="15" r="1.5" fill="white"/>
        <circle cx="7" cy="9" r="1.5" fill="white"/>
    </svg>
);


export default function GamePage() {
  const [animatingBetType, setAnimatingBetType] = useState<string | null>(null);
  const { game } = useGame();

  if (!game) {
    return null;
  }
  
  const betTypes = [
    { title: 'Single Digit', href: `/games/${game.id}/single-digit`, icon: <SingleDigitIcon />, gradient: 'bg-gradient-to-br from-blue-400 to-blue-600' },
    { title: 'Jodi Digit', href: `/games/${game.id}/jodi-digit`, icon: <JodiDigitIcon />, gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600' },
    { title: 'Single Pana', href: `/games/${game.id}/single-pana`, icon: <SinglePanaIcon />, gradient: 'bg-gradient-to-br from-pink-500 to-fuchsia-600' },
    { title: 'Double Pana', href: `/games/${game.id}/double-pana`, icon: <DoublePanaIcon />, gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
    { title: 'Triple Pana', href: `/games/${game.id}/triple-pana`, icon: <TriplePanaIcon />, gradient: 'bg-gradient-to-br from-rose-500 to-red-600' },
    { title: 'Single Pana Bulk', href: `/games/${game.id}/single-pana-bulk`, icon: <SinglePanaBulkIcon />, gradient: 'bg-gradient-to-br from-violet-500 to-purple-600' },
    { title: 'Double Pana Bulk', href: `/games/${game.id}/double-pana-bulk`, icon: <DoublePanaBulkIcon />, gradient: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
    { title: 'SP DP TP', href: `/games/${game.id}/all-pana-bulk`, icon: <AllPanaBulkIcon />, gradient: 'bg-white text-gray-800 shadow-md' },
    { title: 'Half Sangam', href: `/games/${game.id}/half-sangam`, icon: <HalfSangamIcon />, gradient: 'bg-gradient-to-br from-emerald-500 to-green-600' },
    { title: 'Full Sangam', href: `/games/${game.id}/full-sangam`, icon: <FullSangamIcon />, gradient: 'bg-gradient-to-br from-red-500 to-orange-600' },
  ];


  const handleBetTypeClick = (betTypeTitle: string) => {
    setAnimatingBetType(betTypeTitle);
  };

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
      <Card className="bg-background/80 border-white/10 shadow-lg">
          <CardHeader className="p-4">
              <CardTitle className="text-2xl text-center">Choose a Bet Type</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-2">
             {betTypes.map((betType) => (
                <Link key={betType.title} href={betType.href} passHref>
                  <BetTypeItem betType={betType} />
                </Link>
             ))}
          </CardContent>
      </Card>
  );
}
