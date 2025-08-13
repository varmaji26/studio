
'use client';

import React from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
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
        {/* Desktop Sidebar */}
        <Sidebar variant="sidebar" collapsible="icon" className="hidden md:block">
          {sidebarContent}
        </Sidebar>
        
        <SidebarInset>
           <header className="flex items-center justify-between p-4 bg-background border-b sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {/* Mobile Sidebar Trigger */}
                    <div className="md:hidden">
                        <SidebarTrigger className="h-7 w-7" />
                    </div>
                     {/* Desktop Sidebar Trigger */}
                    <SidebarTrigger className="h-7 w-7 hidden md:flex" />

                    
                </div>
                
            </header>
            <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
