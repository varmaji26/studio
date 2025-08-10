
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookText, CircleDollarSign } from 'lucide-react';
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 mb-1"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z" /></svg>
                        <span className="nav-text">Support</span>
                    </button>
                </SupportDialog>
            </div>
        </footer>
    );
}
