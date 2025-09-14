
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
    <div className="fixed inset-x-6 bottom-4 z-50">
      <motion.nav
        role="navigation"
        aria-label="Primary"
        className="relative mx-auto max-w-lg overflow-hidden rounded-3xl backdrop-blur-xl ring-2 ring-white/20 shadow-[0_0_35px_rgba(255,255,255,0.2)]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 animate-[shimmer_5s_linear_infinite] opacity-20" />
        <div className="relative flex items-center justify-around px-4 py-3 bg-[#112a45] rounded-3xl">
          {items.map((it) => {
            const activeNow = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => handleNavigation(it.path, it.id)}
                aria-current={activeNow ? "page" : undefined}
                aria-label={it.label}
                 className={`group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300 focus:outline-none ${
                  activeNow
                    ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.7)]"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <motion.div
                  className={`relative flex items-center justify-center rounded-full p-2 bg-gradient-to-r ${it.gradient}`}
                  animate={{
                    scale: activeNow ? [1, 1.25, 1] : [1, 1.05, 1],
                    rotate:
                      it.id === "contact"
                        ? [0, -10, 10, 0]
                        : it.id === "funds"
                        ? [0, 15, -15, 0]
                        : 0,
                  }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
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
                  <it.Icon className="h-6 w-6 text-white relative z-10" />
                </motion.div>

                <span className="text-[11px] font-semibold leading-none tracking-wide">
                  {it.label}
                </span>

                {activeNow && (
                  <motion.span
                    layoutId="dot"
                    className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white shadow"
                    animate={{ scale: [0.8, 1.4, 1] }}
                    transition={{ duration: 0.4 }}
                  />
                )}

                {it.id === "funds" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.25, 1], rotate: [0, 12, -12, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="pointer-events-none absolute -top-2 right-2 flex h-5 min-w-[22px] items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-500 px-1.5 text-[11px] font-semibold text-white shadow-lg"
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
