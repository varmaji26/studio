'use client';

import React from 'react';
import Link from 'next/link';
import { useGame } from '@/hooks/use-game';

// Simplified icons to match the user's image
const SingleDigitIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 10h-4v4h4v-4zm-6 0H4v4h4v-4zm12 0h-4v4h4v-4z"/>
    </svg>
);
const JodiDigitIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="14" height="10" rx="2" fill="currentColor" stroke="none" opacity="0.7"/>
    <rect x="7" y="6" width="14" height="10" rx="2" fill="currentColor" stroke="none"/>
  </svg>
);
const PanaIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C9.486 2 7.5 3.986 7.5 6.5C7.5 9.742 12 15 12 15s4.5-5.258 4.5-8.5C16.5 3.986 14.514 2 12 2zM10 20v2h4v-2h-4z"/>
  </svg>
);
const HalfSangamIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2A10 10 0 0 0 2 12h20A10 10 0 0 0 12 2z"/>
  </svg>
);
const FullSangamIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
  </svg>
);
const GenericBetIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.41,11.58l-9-9C12.05,2.22,11.55,2,11,2H4C2.9,2,2,2.9,2,4v7c0,0.55,0.22,1.05,0.59,1.42l9,9C13.95,21.78,14.45,22,15,22s1.05-0.22,1.41-0.59l6-6C22.17,14.65,22.17,12.35,21.41,11.58z M13,20l-9-9V4h7l9,9L13,20z"/>
        <circle cx="6.5" cy="6.5" r="1.5"/>
    </svg>
);


const BetTypeCard = ({ href, title, icon }: { href: string; title: string; icon: React.ReactNode }) => (
    <Link href={href} passHref>
        <div className="bg-slate-900 rounded-2xl shadow-md p-4 flex flex-col items-center justify-center space-y-3 h-40 text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-primary/20 active:scale-95">
            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center text-white">
                <div className="transform scale-90">
                    {icon}
                </div>
            </div>
            <p className="text-sm font-semibold text-center">{title}</p>
        </div>
    </Link>
);


export default function GamePage() {
  const { game } = useGame();

  if (!game) {
    return null;
  }
  
  const betTypes = [
    { title: 'Single Digit', href: `/games/${game.id}/single-digit`, icon: <SingleDigitIcon /> },
    { title: 'Jodi Digit', href: `/games/${game.id}/jodi-digit`, icon: <JodiDigitIcon /> },
    { title: 'Single Pana', href: `/games/${game.id}/single-pana`, icon: <PanaIcon /> },
    { title: 'Single Pana Bulk', href: `/games/${game.id}/single-pana-bulk`, icon: <PanaIcon /> },
    { title: 'Double Pana', href: `/games/${game.id}/double-pana`, icon: <PanaIcon /> },
    { title: 'Double Pana Bulk', href: `/games/${game.id}/double-pana-bulk`, icon: <PanaIcon /> },
    { title: 'Triple Pana', href: `/games/${game.id}/triple-pana`, icon: <PanaIcon /> },
    { title: 'Half Sangam', href: `/games/${game.id}/half-sangam`, icon: <HalfSangamIcon /> },
    { title: 'Full Sangam', href: `/games/${game.id}/full-sangam`, icon: <FullSangamIcon /> },
    { title: 'SP DP TP', href: `/games/${game.id}/all-pana-bulk`, icon: <GenericBetIcon /> },
    { title: 'SP Motor', href: `/games/${game.id}/sp-motor`, icon: <GenericBetIcon /> },
    { title: 'DP Motor', href: `/games/${game.id}/dp-motor`, icon: <GenericBetIcon /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {betTypes.map((betType) => (
        <BetTypeCard
          key={betType.title}
          href={betType.href}
          title={betType.title}
          icon={betType.icon}
        />
      ))}
    </div>
  );
}
