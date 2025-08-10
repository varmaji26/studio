
'use client';

import { FaTelegramPlane } from 'react-icons/fa';
import { IoIosDocument } from 'react-icons/io';
import { RiMessage2Fill } from 'react-icons/ri';
import { AiFillDollarCircle } from "react-icons/ai";
import { GiTrophyCup } from "react-icons/gi";
import { useRouter } from 'next/navigation';

interface AppSettings {
    telegramLink?: string;
}

interface QuickLinksProps {
    settings: AppSettings;
}

export function QuickLinks({ settings }: QuickLinksProps) {
    const router = useRouter();

    const handleSupportClick = () => {
        router.push('/contact');
    };

    const handleTelegramClick = () => {
        if (settings.telegramLink) {
            window.open(settings.telegramLink, '_blank');
        } else {
            alert('Telegram link not available.');
        }
    };

    const links = [
        { name: 'My Bids', icon: GiTrophyCup, color: 'bg-yellow-500', action: () => router.push('/bids-history') },
        { name: 'Passbook', icon: IoIosDocument, color: 'bg-green-500', action: () => router.push('/payment-history') },
        { name: 'Support', icon: RiMessage2Fill, color: 'bg-blue-500', action: handleSupportClick },
        { name: 'Funds', icon: AiFillDollarCircle, color: 'bg-red-500', action: () => router.push('/funds') },
        { name: 'Telegram', icon: FaTelegramPlane, color: 'bg-sky-500', action: handleTelegramClick }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {links.map((link, index) => (
                <button
                    key={index}
                    onClick={link.action}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg text-white shadow-md transform hover:scale-105 transition-transform duration-200 ${link.color}`}
                >
                    <link.icon size={28} />
                    <span className="mt-2 text-sm font-bold [text-shadow:1px_1px_2px_#000]">{link.name}</span>
                </button>
            ))}
        </div>
    );
}
