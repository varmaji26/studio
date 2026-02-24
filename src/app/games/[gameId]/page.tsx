'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useGame } from '@/hooks/use-game';

const SingleDigitIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.80005 17.5V30.5C4.80005 32.7091 6.59091 34.5 8.80005 34.5H21.8L33.8 22.5V9.5C33.8 7.29086 32.0092 5.5 29.8 5.5H16.8L4.80005 17.5Z" fill="currentColor" fillOpacity="0.8"/>
        <path d="M21.8 34.5H34.8C37.0092 34.5 38.8 32.7091 38.8 30.5V17.5L21.8 34.5Z" fill="currentColor" fillOpacity="0.6"/>
        <path d="M43.2 22.5L33.8 31.5V9.5L43.2 22.5Z" fill="currentColor" fillOpacity="0.6"/>
        <circle cx="25" cy="15" r="2" fill="currentColor" fillOpacity="0.3"/>
        <circle cx="15" cy="25" r="2" fill="currentColor" fillOpacity="0.3"/>
        <circle cx="10" cy="20" r="1.5" fill="currentColor" fillOpacity="0.3"/>
        <circle cx="20" cy="30" r="1.5" fill="currentColor" fillOpacity="0.3"/>
        <circle cx="30" cy="25" r="1.5" fill="currentColor" fillOpacity="0.3"/>
    </svg>
);

const JodiDigitIcon = () => (
    <svg width="48" height="48" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(15, 0) scale(0.9)" fill="currentColor" opacity="0.7">
            <path d="M9.8 17.5V30.5C9.8 32.7091 11.5909 34.5 13.8 34.5H26.8L38.8 22.5V9.5C38.8 7.29086 37.0092 5.5 34.8 5.5H21.8L9.8 17.5Z" />
            <path d="M26.8 34.5H39.8C42.0092 34.5 43.8 32.7091 43.8 30.5V17.5L26.8 34.5Z" opacity="0.8"/>
            <path d="M48.2 22.5L38.8 31.5V9.5L48.2 22.5Z" opacity="0.8"/>
            <circle cx="30" cy="15" r="2" fill="currentColor" opacity="0.5"/>
            <circle cx="20" cy="25" r="2" fill="currentColor" opacity="0.5"/>
        </g>
        <g transform="translate(0, 5) scale(0.9)" fill="currentColor">
            <path d="M9.8 17.5V30.5C9.8 32.7091 11.5909 34.5 13.8 34.5H26.8L38.8 22.5V9.5C38.8 7.29086 37.0092 5.5 34.8 5.5H21.8L9.8 17.5Z"/>
            <path d="M26.8 34.5H39.8C42.0092 34.5 43.8 32.7091 43.8 30.5V17.5L26.8 34.5Z" opacity="0.8"/>
            <path d="M48.2 22.5L38.8 31.5V9.5L48.2 22.5Z" opacity="0.8"/>
            <circle cx="30" cy="15" r="2" fill="currentColor" opacity="0.4"/>
            <circle cx="20" cy="25" r="2" fill="currentColor" opacity="0.4"/>
            <circle cx="15" cy="20" r="1.5" fill="currentColor" opacity="0.4"/>
            <circle cx="25" cy="30" r="1.5" fill="currentColor" opacity="0.4"/>
            <circle cx="35" cy="25" r="1.5" fill="currentColor" opacity="0.4"/>
        </g>
    </svg>
);

const SinglePanaIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
    </svg>
);

const DoublePanaIcon = () => (
     <svg width="48" height="48" viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(8, 8) scale(0.8)" opacity="0.6">
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
    </svg>
);

const TriplePanaIcon = () => (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(16, 16) scale(0.7)" opacity="0.5">
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
        <g transform="translate(8, 8) scale(0.8)" opacity="0.7">
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
    </svg>
);

const SinglePanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        <rect x="29" y="26" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="29" y="30" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="29" y="34" width="6" height="2" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
);

const DoublePanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(8, 8) scale(0.8)" opacity="0.6">
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
        <g>
            <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
            <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
        </g>
        <rect x="29" y="26" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="29" y="30" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
        <rect x="29" y="34" width="6" height="2" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
);

const HalfSangamIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37V4Z" fill="currentColor"/>
        <path d="M24 4C29.5 12 37 17.5 37 24C37 31.1797 31.1797 37 24 37V4Z" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" fill="currentColor"/>
    </svg>
);

const FullSangamIcon = () => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4C18.5 12 11 17.5 11 24C11 31.1797 16.8203 37 24 37C31.1797 37 37 31.1797 37 24C37 17.5 29.5 12 24 4Z" />
        <path d="M28 36H20C17.7909 36 16 37.7909 16 40V42C16 43.1046 16.8954 44 18 44H30C31.1046 44 32 43.1046 32 42V40C32 37.7909 30.2091 36 28 36Z" />
    </svg>
);

const AllPanaBulkIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
        <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
        <circle cx="17" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="17" cy="15" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="15" r="1.5" fill="currentColor"/>
        <circle cx="7" cy="9" r="1.5" fill="currentColor"/>
    </svg>
);

const SPMotorIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.8"/>
        <path d="M12,7.5a1,1,0,1,1-1-1,1,1,0,0,1,1,1Z" fill="currentColor" opacity="0.4" />
        <path d="M16.5,13a1,1,0,1,1-1-1,1,1,0,0,1,1,1Z" fill="currentColor" opacity="0.4" />
        <path d="M12,18.5a1,1,0,1,1-1-1,1,1,0,0,1,1,1Z" fill="currentColor" opacity="0.4" />
        <path d="M7.5,13a1,1,0,1,1-1-1,1,1,0,0,1,1,1Z" fill="currentColor" opacity="0.4" />
        <path d="M15.06,8.94a1,1,0,1,1-1.41-1.41,1,1,0,0,1,1.41,1.41Z" fill="currentColor" opacity="0.4"/>
        <path d="M8.94,15.06a1,1,0,1,1-1.41-1.41,1,1,0,0,1,1.41,1.41Z" fill="currentColor" opacity="0.4"/>
        <path d="M8.94,8.94a1,1,0,1,1,1.41-1.41,1,1,0,0,1-1.41,1.41Z" fill="currentColor" opacity="0.4"/>
        <path d="M15.06,15.06a1,1,0,1,1,1.41-1.41,1,1,0,0,1-1.41,1.41Z" fill="currentColor" opacity="0.4"/>
    </svg>
);

const DPMotorIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <circle cx="12" cy="9" r="8" />
        <path d="M12 1v2" />
        <path d="M12 15v2" />
        <path d="M4.929 4.929l1.414 1.414" />
        <path d="M17.657 17.657l-1.414-1.414" />
        <path d="M3 9h2" />
        <path d="M19 9h2" />
        <path d="M4.929 13.071l1.414-1.414" />
        <path d="M17.657 6.343l-1.414 1.414" />
        <circle cx="12" cy="9" r="2" fill="currentColor" stroke="none" />
    </svg>
);


export default function GamePage() {
  const [animatingBetType, setAnimatingBetType] = useState<string | null>(null);
  const { game } = useGame();

  if (!game) {
    return null;
  }
  
  const betTypes = [
    { title: 'Single Digit', href: `/games/${game.id}/single-digit`, icon: <SingleDigitIcon /> },
    { title: 'Jodi Digit', href: `/games/${game.id}/jodi-digit`, icon: <JodiDigitIcon /> },
    { title: 'Single Pana', href: `/games/${game.id}/single-pana`, icon: <SinglePanaIcon /> },
    { title: 'Double Pana', href: `/games/${game.id}/double-pana`, icon: <DoublePanaIcon /> },
    { title: 'Triple Pana', href: `/games/${game.id}/triple-pana`, icon: <TriplePanaIcon /> },
    { title: 'Single Pana Bulk', href: `/games/${game.id}/single-pana-bulk`, icon: <SinglePanaBulkIcon /> },
    { title: 'Double Pana Bulk', href: `/games/${game.id}/double-pana-bulk`, icon: <DoublePanaBulkIcon /> },
    { title: 'SP DP TP', href: `/games/${game.id}/all-pana-bulk`, icon: <AllPanaBulkIcon /> },
    { title: 'SP Motor', href: `/games/${game.id}/sp-motor`, icon: <SPMotorIcon /> },
    { title: 'DP Motor', href: `/games/${game.id}/dp-motor`, icon: <DPMotorIcon /> },
    { title: 'Half Sangam', href: `/games/${game.id}/half-sangam`, icon: <HalfSangamIcon /> },
    { title: 'Full Sangam', href: `/games/${game.id}/full-sangam`, icon: <FullSangamIcon /> },
  ];


  const handleBetTypeClick = (betTypeTitle: string) => {
    setAnimatingBetType(betTypeTitle);
  };

  const BetTypeItem = ({ betType }: { betType: (typeof betTypes)[0] }) => (
    <div
      onClick={() => handleBetTypeClick(betType.title)}
      className={cn(
        "rounded-xl p-2 text-center flex flex-col items-center justify-center space-y-1 h-36 cursor-pointer",
        "transition-all duration-300 transform hover:scale-105 hover:bg-slate-700/[.35]",
        "bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700",
        animatingBetType === betType.title && 'animate-pulse-once'
      )}
    >
      <div className="h-16 w-16 rounded-full bg-slate-900/70 flex items-center justify-center mb-1 text-primary">
        {betType.icon}
      </div>
      <p className="font-semibold text-xs text-foreground truncate w-full">{betType.title}</p>
    </div>
  );

  return (
      <Card className="bg-transparent border-none shadow-none">
          <CardContent className="grid grid-cols-2 gap-2 p-0">
             {betTypes.map((betType) => (
                <Link key={betType.title} href={betType.href} passHref>
                  <BetTypeItem betType={betType} />
                </Link>
             ))}
          </CardContent>
      </Card>
  );
}
