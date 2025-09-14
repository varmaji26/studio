'use client';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, BookText, MessageSquare, IndianRupee } from "lucide-react";
import { useRouter, usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

interface BottomNavbarProps {
  settings?: any;
}

export function BottomNavbar({ settings }: BottomNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const items = [
    { id: "my-bets", label: "My Bets", Icon: Trophy, gradient: "from-pink-500 via-red-500 to-yellow-500", path: "/my-bets" },
    { id: "transactions", label: "Passbook", Icon: BookText, gradient: "from-green-400 via-emerald-500 to-teal-500", path: "/transactions" },
    { id: "contact", label: "Support", Icon: MessageSquare, gradient: "from-sky-400 via-blue-500 to-indigo-500", path: "/contact" },
    { id: "funds", label: "Funds", Icon: IndianRupee, gradient: "from-purple-500 via-fuchsia-500 to-pink-500", path: "/funds" },
  ];

  const getCurrentActiveItem = () => {
      const currentItem = items.find(item => pathname.startsWith(item.path));
      return currentItem ? currentItem.id : "";
  };
  
  const [active, setActive] = useState(getCurrentActiveItem);
  
  useEffect(() => {
    setActive(getCurrentActiveItem());
  }, [pathname]);


  const handleNavigation = (path: string, id: string) => {
    setActive(id);
    router.push(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <motion.nav
        role="navigation"
        aria-label="Primary"
        className="relative mx-auto w-full overflow-hidden backdrop-blur-xl ring-2 ring-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      >
        <div className="relative flex items-center justify-around px-2 py-2 bg-[#112a45]">
          {items.map((it) => {
            const activeNow = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => handleNavigation(it.path, it.id)}
                aria-current={activeNow ? "page" : undefined}
                aria-label={it.label}
                 className={`group relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all duration-300 focus:outline-none ${
                  activeNow
                    ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.7)]"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <motion.div
                  className={`relative flex items-center justify-center rounded-full p-1.5 bg-gradient-to-r ${it.gradient}`}
                  animate={activeNow ? {
                    scale: [1, 1.25, 1],
                    rotate:
                      it.id === "contact"
                        ? [0, -10, 10, 0]
                        : it.id === "funds"
                        ? [0, 15, -15, 0]
                        : 0,
                  }: {}}
                  transition={{ repeat: activeNow ? Infinity : 0, duration: 2.5, ease: "easeInOut" }}
                >
                  {activeNow && (
                    <motion.span
                      layoutId="glow"
                      className="absolute inset-0 rounded-full bg-white/20 blur-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: [0.9, 1.3, 1] }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                  <it.Icon className="h-5 w-5 text-white relative z-10" />
                </motion.div>

                <span className="text-[10px] font-semibold leading-none tracking-wide">
                  {it.label}
                </span>

                {activeNow && (
                  <motion.span
                    layoutId="dot"
                    className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white shadow"
                    animate={{ scale: [0.8, 1.4, 1] }}
                    transition={{ duration: 0.4 }}
                  />
                )}

                {it.id === "funds" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.25, 1], rotate: [0, 12, -12, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="pointer-events-none absolute -top-1.5 right-1.5 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-500 px-1 text-[10px] font-semibold text-white shadow-lg"
                  >
                    ₹
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
