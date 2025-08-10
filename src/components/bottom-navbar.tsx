
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
    { href: '/bids-history', icon: LineChart, label: 'My Bids' },
    { href: '/payment-history', icon: BookText, label: 'Passbook' },
    { href: '/', icon: Home, label: 'Home' },
    { href: '/funds', icon: CircleDollarSign, label: 'Funds' },
];

export function BottomNavbar({ settings }: BottomNavbarProps) {
    const pathname = usePathname();

    return (
        <footer className="bottom-nav-simple">
            <div className="nav-container-simple">
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link key={href} href={href} className={cn(
                            "nav-item-simple",
                            { 'active': isActive }
                        )}>
                           <Icon className="nav-icon-simple" />
                           <span className="nav-text-simple">{label}</span>
                        </Link>
                    )
                })}

                <SupportDialog
                    callNumber={settings.callSupportNumber}
                    whatsappNumber={settings.whatsappNumber}
                >
                    <button className="nav-item-simple">
                        <MessageSquare className="nav-icon-simple"/>
                        <span className="nav-text-simple">Support</span>
                    </button>
                </SupportDialog>
            </div>
        </footer>
    );
}
