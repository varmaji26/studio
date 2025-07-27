
'use client';

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from '@/components/ui/sidebar';
import {
  LogOut,
  Settings,
  Trophy
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  
  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleLinkClick = () => {
    // This will be handled by the sidebar provider now
  };

  const sidebarItems = (
    <>
      <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="p-1.5 rounded-lg bg-primary">
                <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-primary-foreground">Matka Genius</h1>
          </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/admin" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin')} tooltip={{children: "Dashboard"}}>
                {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[0]}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <Link href="/admin/manage-users" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-users')} tooltip={{children: "Manage Users"}}>
                  {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[1]}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Market"}}>
             {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[2]}
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <Link href="/admin/manage-games" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-games')} tooltip={{children: "Manage Games"}}>
                 {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[3]}
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/manage-banners" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-banners')} tooltip={{children: "Manage Banners"}}>
                    {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[4]}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/update-results" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/update-results')} tooltip={{children: "Update Result"}}>
                {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[5]}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Update Result (Close)"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[6]}
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/charts" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/charts')} tooltip={{children: "Game Charts"}}>
                 {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[7]}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Market-wise Load"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[8]}
            </SidebarMenuButton>
          </SidebarMenuItem>
            <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Bid History"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[9]}
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Win History"}}>
             {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[10]}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Find Password"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[11]}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/deposits" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/deposits')} tooltip={{children: "Deposits/Withdrawals"}}>
                {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[12]}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "220 Matka Pana List"}}>
             {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[13]}
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Registered Users"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[14]}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Payment"}}>
              {sidebarContent && (sidebarContent as React.ReactElement).props.children[1].props.children[15]}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
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
    </>
  );

  return (
    <SidebarProvider>
      <div className="dark min-h-screen bg-background text-foreground flex">
        <Sidebar variant="sidebar" collapsible="icon">
          {sidebarItems}
        </Sidebar>
        <SidebarInset>
           <header className="flex items-center justify-between p-4 bg-background border-b sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <h2 className="text-xl font-semibold capitalize hidden sm:block">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Settings />
                  </Button>
                  <Button onClick={() => router.push('/')}>Go to User Panel</Button>
                </div>
            </header>
            {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
