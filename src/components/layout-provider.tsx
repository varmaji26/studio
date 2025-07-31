
'use client';

import React from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LogOut,
  Settings,
  Home,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader as SheetHeaderComponent } from '@/components/ui/sheet';
import Link from 'next/link';

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
      <div className="dark min-h-screen bg-background text-foreground flex">
        {/* Desktop Sidebar */}
        <Sidebar variant="sidebar" collapsible="icon" className="hidden md:block">
          {sidebarContent}
        </Sidebar>
        
        <SidebarInset>
           <header className="flex items-center justify-between p-4 bg-background border-b sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {/* Mobile Sidebar Trigger */}
                    <div className="md:hidden">
                        <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <SidebarTrigger className="h-7 w-7" />
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72 flex flex-col">
                               {sidebarContent}
                            </SheetContent>
                        </Sheet>
                    </div>
                     {/* Desktop Sidebar Trigger */}
                    <SidebarTrigger className="h-7 w-7 hidden md:flex" />

                    <h2 className="text-xl font-semibold capitalize hidden sm:block">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/">
                    <Button className="bg-green-500 text-white hover:bg-green-600">
                      <Home className="mr-2 h-4 w-4" />
                      Go to User Panel
                    </Button>
                  </Link>
                  <Link href="/admin/settings">
                      <Button variant="ghost" size="icon">
                        <Settings />
                      </Button>
                  </Link>
                </div>
            </header>
            <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
