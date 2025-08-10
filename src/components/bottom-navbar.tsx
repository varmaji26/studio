
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookText, CircleDollarSign, MessageSquare } from 'lucide-react';
import { SupportDialog } from '@/components/support-dialog';
import { cn } from '@/lib/utils';
import { NavBarClipper } from './ui/icons';

interface AppSettings {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

interface BottomNavbarProps {
    settings: AppSettings;
}

const navItems = [
    { href: '/bids-history', icon: LineChart, label: 'My Bids' },
    { href: '/payment-history', icon: BookText, label: 'Passbook' },
    { href: '/', icon: Home, label: 'Home' },
    { href: '/funds', icon: CircleDollarSign, label: 'Funds' },
];

export function BottomNavbar({ settings }: BottomNavbarProps) {
    const pathname = usePathname();

    return (
        <footer className="fixed bottom-0 left-0 right-0 h-[70px] z-50">
            <div className="relative h-full w-full">
                <NavBarClipper className="absolute bottom-0 left-0 w-full h-full text-[#005A9C]" />
                
                <div className="absolute inset-0 flex justify-around items-center text-white">
                    {navItems.slice(0, 2).map(({ href, icon: Icon, label }) => (
                         <Link key={href} href={href} className="flex flex-col items-center justify-center h-full w-1/5">
                            <Icon className="h-6 w-6 mb-1" />
                            <span className="text-xs">{label}</span>
                        </Link>
                    ))}
                    <div className="w-1/5" />
                    {navItems.slice(3).map(({ href, icon: Icon, label }) => (
                         <Link key={href} href={href} className="flex flex-col items-center justify-center h-full w-1/5">
                            <Icon className="h-6 w-6 mb-1" />
                            <span className="text-xs">{label}</span>
                        </Link>
                    ))}
                    <SupportDialog
                        callNumber={settings.callSupportNumber}
                        whatsappNumber={settings.whatsappNumber}
                    >
                        <button className="flex flex-col items-center justify-center h-full w-1/5">
                            <div className="relative">
                                <MessageSquare className="h-6 w-6 mb-1 text-green-400" />
                                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_theme(colors.green.400)]"></div>
                            </div>
                            <span className="text-xs">Support</span>
                        </button>
                    </SupportDialog>
                </div>

                <Link href="/" className="absolute -top-7 left-1/2 -translate-x-1/2">
                    <div className="h-[60px] w-[60px] bg-primary rounded-full flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                        <Home className="text-white h-8 w-8" />
                    </div>
                </Link>
            </div>
        </footer>
    );
}
