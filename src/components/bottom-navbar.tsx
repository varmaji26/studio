
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HiOutlineChartBar, HiOutlineClipboardList, HiOutlineHome, HiOutlineCurrencyDollar } from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";
import { SupportDialog } from '@/components/support-dialog';
import { cn } from "@/lib/utils";

interface AppSettings {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

interface BottomNavbarProps {
    settings: AppSettings;
}

const menuItems = [
  { name: "My Bids", icon: HiOutlineChartBar, href: "/bids-history" },
  { name: "Passbook", icon: HiOutlineClipboardList, href: "/payment-history" },
  { name: "Home", icon: HiOutlineHome, href: "/" },
  { name: "Funds", icon: HiOutlineCurrencyDollar, href: "/funds" },
  { name: "Support", icon: FaWhatsapp, href: "#" },
];

export function BottomNavbar({ settings }: BottomNavbarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 w-full h-[70px] z-50">
        <div className="relative h-full">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                <div className="relative w-full h-full">
                    <div
                        className="absolute w-[200%] h-[200%] -left-1/2 -top-[150%] bg-[#005A9C] rounded-[100%]"
                        style={{
                            clipPath: 'polygon(0% 100%, 100% 100%, 100% 75%, 65% 75%, 50% 87.5%, 35% 75%, 0% 75%)'
                        }}
                    ></div>
                </div>
            </div>

            <div className="absolute top-0 left-0 w-full h-full flex justify-around items-center pt-2">
                 {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const isHome = item.name === "Home";
                    const isSupport = item.name === "Support";
                    
                    if (isHome) {
                         return (
                            <Link key={item.name} href={item.href} className="absolute left-1/2 -translate-x-1/2 -top-5 z-20 flex flex-col items-center">
                                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-background">
                                    <Icon size={32} className="text-white" />
                                </div>
                                <span className={cn("text-xs mt-1", isActive ? "text-orange-400" : "text-white")}>{item.name}</span>
                            </Link>
                         )
                    }

                    const itemContent = (
                        <div className={cn("flex flex-col items-center text-xs w-full", isActive ? 'text-orange-400' : 'text-white')}>
                             <div className={cn("mb-1", isSupport ? "p-1.5 rounded-full support-glow" : "")}>
                                <Icon size={24} className={isSupport ? "text-green-400" : ""} />
                            </div>
                            <span>{item.name}</span>
                        </div>
                    );

                    if (isSupport) {
                        return (
                             <div key={item.name} className="w-1/5 flex justify-center">
                                <SupportDialog
                                    callNumber={settings.callSupportNumber}
                                    whatsappNumber={settings.whatsappNumber}
                                >
                                    <div className="w-full flex justify-center cursor-pointer">
                                        {itemContent}
                                    </div>
                                </SupportDialog>
                             </div>
                        )
                    }

                    return (
                        <Link key={item.name} href={item.href} className="w-1/5 flex justify-center">
                            {itemContent}
                        </Link>
                    );
                })}
            </div>
        </div>
    </div>
  );
}
