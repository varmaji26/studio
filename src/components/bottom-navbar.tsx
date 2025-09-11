
'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Trophy, BookText, MessageSquare, IndianRupee } from 'lucide-react';
import type { DocumentData } from 'firebase/firestore';

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
    telegramLink?: string;
}

interface BottomNavbarProps {
    settings: AppSettings;
}

export function BottomNavbar({ settings }: BottomNavbarProps) {
    const router = useRouter();
    
    const navItems = [
        { label: 'My Bets', action: () => router.push('/my-bets'), color: 'bg-yellow-500', icon: <Trophy className="h-5 w-5" style={{ filter: 'drop-shadow(1px 1px 2px #000)' }} /> },
        { label: 'Passbook', action: () => router.push('/transactions'), color: 'bg-green-500', icon: <BookText className="h-5 w-5" style={{ filter: 'drop-shadow(1px 1px 2px #000)' }} /> },
        { label: 'Support', action: () => router.push('/contact'), color: 'bg-sky-500', icon: <MessageSquare className="h-5 w-5" style={{ filter: 'drop-shadow(1px 1px 2px #000)' }} /> },
        { label: 'Funds', action: () => router.push('/funds'), color: 'bg-red-500', icon: <IndianRupee className="h-5 w-5" style={{ filter: 'drop-shadow(1px 1px 2px #000)' }} /> },
    ];
    
    return (
         <div className="fixed bottom-0 left-0 w-full bg-[#0A2342] border-t border-white/10 z-50">
            <div className="grid grid-cols-4 gap-1 p-2">
                {navItems.map(({ label, action, color, icon }) => (
                     <button
                        key={label}
                        onClick={action}
                        className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg text-white shadow-md transform hover:scale-105 transition-transform duration-200",
                            color
                        )}
                    >
                        {icon}
                        <span className="mt-1 text-xs font-bold" style={{ textShadow: '1px 1px 2px #000' }}>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
