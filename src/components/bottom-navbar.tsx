
'use client';

import { useState, useEffect } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from "framer-motion";
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
  { name: "My Bids", icon: <HiOutlineChartBar size={24} />, href: "/bids-history" },
  { name: "Passbook", icon: <HiOutlineClipboardList size={24} />, href: "/payment-history" },
  { name: "Home", icon: <HiOutlineHome size={28} />, href: "/" },
  { name: "Funds", icon: <HiOutlineCurrencyDollar size={24} />, href: "/funds" },
  { name: "Support", icon: <FaWhatsapp size={24} />, href: "#" },
];

export function BottomNavbar({ settings }: BottomNavbarProps) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(2);

  useEffect(() => {
    const currentPath = pathname.split('/')[1];
    const activeItem = menuItems.findIndex(item => item.href.includes(currentPath) && item.href !== '/');
    setActiveIndex(activeItem !== -1 ? activeItem : 2);
  }, [pathname]);


  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#005A9C] h-[70px] flex items-center justify-around rounded-t-2xl z-50">
      
      {menuItems.map((item, index) => {
        const isActive = activeIndex === index;
        const isSupport = item.name === "Support";

        if (isSupport) {
            return (
                <SupportDialog
                    key={index}
                    callNumber={settings.callSupportNumber}
                    whatsappNumber={settings.whatsappNumber}
                >
                    <div
                        className="flex flex-col items-center text-white text-xs relative cursor-pointer"
                    >
                         <div className="p-1 rounded-full shadow-[0_0_15px_rgba(0,255,0,0.8)] mb-1">
                            <FaWhatsapp size={24} className="text-green-400" />
                        </div>
                        <span className="text-white">{item.name}</span>
                    </div>
                </SupportDialog>
            )
        }
        
        const isHome = item.name === "Home";

        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
                "flex flex-col items-center justify-center text-white text-xs relative h-full w-1/5",
                isHome ? "-mt-8" : "mt-2"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeCircle"
                className={cn(
                    "absolute flex items-center justify-center shadow-lg",
                    isHome 
                    ? "w-16 h-16 bg-orange-500 rounded-full -top-1"
                    : "w-full -top-2"
                )}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              >
                { !isHome && (
                    <svg
                        className="absolute top-0 w-full h-auto"
                        viewBox="0 0 80 20"
                        fill="#005A9C"
                        >
                        <path d="M0 20 C20 0, 60 0, 80 20 Z" />
                    </svg>
                )}
                 <div className={cn("z-10", isHome && "text-white")}>{item.icon}</div>
              </motion.div>
            )}

             <div className={cn("mb-1 z-10", isActive && isHome && "hidden")}>{item.icon}</div>

            <span className={cn(
                "z-10",
                isActive ? "text-orange-400" : "text-white",
                isHome && "mt-16"
                )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
