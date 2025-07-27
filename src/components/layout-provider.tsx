
'use client';

import React from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider,
  SidebarFooter
} from '@/components/ui/sidebar';
import {
  LogOut,
  Settings,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';

export function LayoutProvider({
  children,
  sidebarContent,
}: {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
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
      <div className="dark min-h-screen bg-background text-foreground flex">
        <Sidebar variant="sidebar" collapsible="icon">
          {sidebarContent}
           <SidebarFooter>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-card">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src="https://placehold.co/48x48.png" data-ai-hint="avatar" />
                        <AvatarFallback>{user?.displayName?.charAt(0) ?? 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{user?.displayName ?? 'Admin'}</span>
                        <span className="text-xs text-muted-foreground">Admin</span>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                        <LogOut />
                    </Button>
                </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
           <header className="flex items-center justify-between p-4 bg-background border-b sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-7 w-7" />
                    <h2 className="text-xl font-semibold capitalize hidden sm:block">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Settings />
                  </Button>
                  <Button onClick={() => router.push('/')}>Go to User Panel</Button>
                </div>
            </header>
            <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
