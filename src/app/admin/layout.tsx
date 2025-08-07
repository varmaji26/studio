
'use client';

import React from 'react';
import {
  Home,
  Users,
  Building,
  Gamepad,
  CheckCircle,
  XCircle,
  BarChart2,
  LineChart,
  History,
  Trophy,
  KeyRound,
  ArrowLeftRight,
  ClipboardList,
  UserCheck,
  CreditCard,
  Settings,
  ImageIcon,
  AreaChart,
  Eye,
  ChevronDown
} from 'lucide-react';
import { LayoutProvider } from '@/components/layout-provider';
import { SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/loader';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  const isActive = (path: string) => pathname === path;

  const isLoadMenuInitiallyOpen = isActive('/admin/view-open-load') || isActive('/admin/view-close-load') || isActive('/admin/view-gametype-load');
  const [isLoadMenuOpen, setIsLoadMenuOpen] = React.useState(isLoadMenuInitiallyOpen);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading) {
      if (!user || !user.isAdmin) {
        router.replace('/');
      }
    }
  }, [user, authLoading, router]);

  const handleLinkClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (authLoading || !user || !user.isAdmin) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const sidebarItems = (
    <>
      <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="p-1.5 rounded-lg bg-primary">
                <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-primary-foreground">Matka King</h1>
          </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/admin" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={pathname === '/admin'} tooltip={{children: "Dashboard"}}>
                <Home />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <Collapsible open={isLoadMenuOpen} onOpenChange={setIsLoadMenuOpen}>
              <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                     <SidebarMenuButton 
                        isActive={isLoadMenuInitiallyOpen} 
                        className="w-full justify-between"
                     >
                        <div className="flex items-center gap-2">
                            <Eye />
                            <span>View All Load</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isLoadMenuOpen && "rotate-180")} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
              </SidebarMenuItem>
              <CollapsibleContent className="space-y-1 ml-6 mt-1 border-l border-muted pl-4">
                 <SidebarMenuItem>
                    <Link href="/admin/view-open-load" passHref onClick={handleLinkClick}>
                      <SidebarMenuButton size="sm" variant="ghost" isActive={isActive('/admin/view-open-load')}>
                        <span>View Open Load</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Link href="/admin/view-close-load" passHref onClick={handleLinkClick}>
                      <SidebarMenuButton size="sm" variant="ghost" isActive={isActive('/admin/view-close-load')}>
                        <span>View Close Load</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <Link href="/admin/view-gametype-load" passHref onClick={handleLinkClick}>
                      <SidebarMenuButton size="sm" variant="ghost" isActive={isActive('/admin/view-gametype-load')}>
                        <span>View Game-Type wise Load</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
              </CollapsibleContent>
           </Collapsible>
          <SidebarMenuItem>
             <Link href="/admin/manage-users" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-users')} tooltip={{children: "Manage Users"}}>
                  <Users />
                  <span>Manage Users</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Market"}}>
              <Building />
              <span>Market</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <Link href="/admin/manage-games" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-games')} tooltip={{children: "Manage Games"}}>
                    <Gamepad />
                    <span>Manage Games</span>
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/manage-banners" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-banners')} tooltip={{children: "Manage Banners"}}>
                    <ImageIcon />
                    <span>Manage Banners</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/update-results" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/update-results')} tooltip={{children: "Update Result (Open)"}}>
                <CheckCircle />
                <span>Update Result (Open)</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/update-results-close" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/update-results-close')} tooltip={{children: "Update Result (Close)"}}>
                    <XCircle />
                    <span>Update Result (Close)</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/charts" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/charts')} tooltip={{children: "Game Charts"}}>
                    <BarChart2 />
                    <span>Game Charts</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/market-load" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/market-load')} tooltip={{children: "Market-wise Load"}}>
                  <LineChart />
                  <span>Market-wise Load</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/admin/bid-history" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/bid-history')} tooltip={{children: "Bid History"}}>
                  <History />
                  <span>Bid History</span>
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
              <Link href="/admin/win-history" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/win-history')} tooltip={{children: "Win History"}}>
                 <Trophy />
                 <span>Win History</span>
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/find-password" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/find-password')} tooltip={{children: "Find Password"}}>
                  <KeyRound />
                  <span>Find Password</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/deposits" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/deposits')} tooltip={{children: "Deposits/Withdrawals"}}>
                <ArrowLeftRight />
                <span>Deposits/Withdrawals</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/payment-history" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/payment-history')} tooltip={{children: "Payment History"}}>
                <CreditCard />
                <span>Payment History</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/jodi-panel" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/jodi-panel')} tooltip={{children: "Manage Jodi Chart"}}>
                <ClipboardList />
                <span>Manage Jodi Chart</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/panel-chart" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/panel-chart')} tooltip={{children: "Manage Panel Chart"}}>
                <ClipboardList />
                <span>Manage Panel Chart</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Registered Users"}}>
              <UserCheck />
              <span>Registered Users</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Payment"}}>
              <CreditCard />
              <span>Payment</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/admin/settings" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/settings')} tooltip={{children: "Settings"}}>
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
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
    <LayoutProvider 
        sidebarContent={sidebarItems}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setIsSidebarOpen}
    >
      {children}
    </LayoutProvider>
  );
}
