
'use client';

import React from 'react';
import {
  SidebarProvider,
} from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';

export function LayoutProvider({
  children,
  sidebarContent,
  isSidebarOpen,
  setSidebarOpen,
}: {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {sidebarContent}
        <main className="flex-1">
            {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
