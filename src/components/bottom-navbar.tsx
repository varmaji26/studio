
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookText, CircleDollarSign, MessageSquare } from 'lucide-react';
import { SupportDialog } from '@/components/support-dialog';
import { cn } from '@/lib/utils';

interface AppSettings {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

interface BottomNavbarProps {
    settings: AppSettings;
}

const navItems = [
    { href: '/bids-history', icon: LineChart, label: 'My Bids', position: 1 },
    { href: '/payment-history', icon: BookText, label: 'Passbook', position: 2 },
    { href: '/', icon: Home, label: 'Home', position: 3 },
    { href: '/funds', icon: CircleDollarSign, label: 'Funds', position: 4 },
];

export function BottomNavbar({ settings }: BottomNavbarProps) {
    const pathname = usePathname();

    const getActivePosition = () => {
        if (pathname === '/') return 3;
        const activeItem = navItems.find(item => item.href !== '/' && pathname.startsWith(item.href));
        return activeItem ? activeItem.position : 3;
    }

    const activePosition = getActivePosition();
    
    const totalItems = 5;
    const itemWidthPercentage = 100 / totalItems;
    const indicatorCenterPercentage = itemWidthPercentage * (activePosition - 0.5);

    const indicatorPosition = `calc(${indicatorCenterPercentage}% - 32px)`;
    const wavePosition = `calc(${indicatorCenterPercentage}% - 40px)`;
    

    return (
        <footer className="bottom-nav">
            <svg className="nav-wave" style={{ left: wavePosition }} viewBox="0 0 80 20" preserveAspectRatio="none">
                <path d="M0,20 Q20,0 40,20 Q60,0 80,20 Z" />
            </svg>
            <div className="nav-container">
                 <div className="nav-active-indicator" style={{ left: indicatorPosition }} />
                
                {navItems.map(({ href, icon: Icon, label, position }) => (
                    <Link key={href} href={href} className={cn("nav-item w-1/5", { 'active': pathname === href || (href !== '/' && pathname.startsWith(href)) })}>
                       <Icon className="nav-icon h-6 w-6 mb-1" />
                       <span className="nav-text">{label}</span>
                    </Link>
                ))}

                <SupportDialog
                    callNumber={settings.callSupportNumber}
                    whatsappNumber={settings.whatsappNumber}
                >
                    <button className="nav-item w-1/5">
                        <MessageSquare className="h-6 w-6 mb-1"/>
                        <span className="nav-text">Support</span>
                    </button>
                </SupportDialog>
            </div>
        </footer>
    );
}
