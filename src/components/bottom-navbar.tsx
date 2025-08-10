
'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, History, MessageSquare, IndianRupee } from 'lucide-react';
import { FaTelegramPlane } from "react-icons/fa";

interface BottomNavbarProps {
    settings: {
        telegramLink?: string;
    };
}

export function BottomNavbar({ settings }: BottomNavbarProps) {
    const router = useRouter();

    const handleTelegramClick = () => {
        if (settings.telegramLink) {
            window.open(settings.telegramLink, '_blank');
        } else {
            alert('Telegram link not available.');
        }
    };
    
    const navItems = [
        { label: 'My Bids', action: () => router.push('/bids-history'), color: 'bg-yellow-500' },
        { label: 'Passbook', action: () => router.push('/payment-history'), color: 'bg-green-500' },
        { label: 'Support', action: () => router.push('/contact'), color: 'bg-blue-500' },
        { label: 'Funds', action: () => router.push('/funds'), color: 'bg-red-500' },
        { label: 'Telegram', action: handleTelegramClick, color: 'bg-sky-500' },
    ];
    
    return (
         <div className="fixed bottom-0 left-0 w-full bg-[#005A9C] border-t border-white/10 z-50">
            <div className="grid grid-cols-5 gap-1 p-2">
                {navItems.map(({ label, action, color }) => (
                     <button
                        key={label}
                        onClick={action}
                        className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg text-white shadow-md transform hover:scale-105 transition-transform duration-200",
                            color
                        )}
                    >
                        <span className="mt-1 text-sm font-bold [text-shadow:1px_1px_2px_#000]">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
