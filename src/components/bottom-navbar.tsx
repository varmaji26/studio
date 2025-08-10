
'use client';

import { useState, useEffect } from "react";
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
            {/* Curved background shape */}
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

            {/* Navigation Items */}
            <div className="absolute top-0 left-0 w-full h-full flex justify-around items-center">
                 {menuItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const isHome = item.name === "Home";
                    const isSupport = item.name === "Support";
                    
                    if (isHome) {
                         return (
                            <Link key={index} href={item.href} className="absolute left-1/2 -translate-x-1/2 -top-5 z-20">
                                <div className={cn(
                                    "flex flex-col items-center justify-center text-xs",
                                     isActive ? "text-orange-500" : "text-white"
                                )}>
                                    <div className="bg-background p-1 rounded-full">
                                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Icon size={28} className="text-white" />
                                        </div>
                                    </div>
                                    <span>{item.name}</span>
                                </div>
                            </Link>
                         )
                    }

                    if (isSupport) {
                        return (
                            <div key={index} className="w-1/5 flex justify-center">
                                <SupportDialog
                                    callNumber={settings.callSupportNumber}
                                    whatsappNumber={settings.whatsappNumber}
                                >
                                    <div className="flex flex-col items-center text-white text-xs cursor-pointer">
                                        <div className="p-1.5 rounded-full support-glow mb-1">
                                            <Icon size={24} className="text-green-400" />
                                        </div>
                                        <span>{item.name}</span>
                                    </div>
                                </SupportDialog>
                            </div>
                        )
                    }

                    return (
                        <div key={index} className="w-1/5 flex justify-center">
                             <Link href={item.href} className={cn(
                                "flex flex-col items-center text-xs",
                                isActive ? 'text-orange-400' : 'text-white'
                             )}>
                                <Icon size={24} className="mb-1" />
                                <span>{item.name}</span>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}
