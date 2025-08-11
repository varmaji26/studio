
'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { History, BookText, MessageSquare, IndianRupee } from 'lucide-react';
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
        { label: 'My Bids', action: () => router.push('/bids-history'), color: 'bg-yellow-500', icon: <History className="h-6 w-6" /> },
        { label: 'Passbook', action: () => router.push('/payment-history'), color: 'bg-green-500', icon: <BookText className="h-6 w-6" /> },
        { label: 'Support', action: () => router.push('/contact'), color: 'bg-blue-500', icon: <MessageSquare className="h-6 w-6" /> },
        { label: 'Funds', action: () => router.push('/funds'), color: 'bg-red-500', icon: <IndianRupee className="h-6 w-6" /> },
        { label: 'Telegram', action: handleTelegramClick, color: 'bg-sky-500', icon: <FaTelegramPlane className="h-6 w-6" /> },
    ];
    
    return (
         <div className="fixed bottom-0 left-0 w-full bg-[#005A9C] border-t border-white/10 z-50">
            <div className="grid grid-cols-5 gap-1 p-2">
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
                        <span className="mt-1 text-xs font-bold [text-shadow:1px_1px_2px_#000]">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
