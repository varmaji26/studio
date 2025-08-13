
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
  ArrowUpCircle,
  ArrowDownCircle,
  ClipboardList,
  UserCheck,
  CreditCard,
  Settings,
  ImageIcon,
  AreaChart,
  Eye,
  ChevronDown,
  MailQuestion,
  Send,
  Gift,
} from 'lucide-react';
import { LayoutProvider } from '@/components/layout-provider';
import { SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
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
  const [pendingRequestsCount, setPendingRequestsCount] = React.useState(0);
  const [newUsersCount, setNewUsersCount] = React.useState(0);
  const [todaysBidsCount, setTodaysBidsCount] = React.useState(0);
  const [todaysWinsCount, setTodaysWinsCount] = React.useState(0);
  
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

  React.useEffect(() => {
    // Listener for pending requests
    const depositsQuery = query(collection(db, "deposits"), where("status", "==", "pending"));
    const withdrawalsQuery = query(collection(db, "withdrawals"), where("status", "==", "pending"));

    let depositsCount = 0;
    let withdrawalsCount = 0;

    const unsubDeposits = onSnapshot(depositsQuery, (snapshot) => {
        depositsCount = snapshot.size;
        setPendingRequestsCount(depositsCount + withdrawalsCount);
    });

    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
        withdrawalsCount = snapshot.size;
        setPendingRequestsCount(depositsCount + withdrawalsCount);
    });

    // Listener for new users
    const lastViewedUsersTimestamp = localStorage.getItem('lastViewedUsersTimestamp');
    const lastViewedUsersDate = lastViewedUsersTimestamp ? new Date(parseInt(lastViewedUsersTimestamp, 10)) : new Date(0);

    const newUsersQuery = query(collection(db, "users"), where("createdAt", ">=", Timestamp.fromDate(lastViewedUsersDate)));
    const unsubNewUsers = onSnapshot(newUsersQuery, (snapshot) => {
        setNewUsersCount(snapshot.size);
    });
    
    // Listener for today's bids and wins
    const lastViewedBidsTimestamp = localStorage.getItem('lastViewedBidsTimestamp');
    const lastViewedBidsDate = lastViewedBidsTimestamp ? new Date(parseInt(lastViewedBidsTimestamp, 10)) : new Date(0);
    const lastViewedWinsTimestamp = localStorage.getItem('lastViewedWinsTimestamp');
    const lastViewedWinsDate = lastViewedWinsTimestamp ? new Date(parseInt(lastViewedWinsTimestamp, 10)) : new Date(0);


    const todaysBidsQuery = query(collection(db, "bids"), where("createdAt", ">=", Timestamp.fromDate(lastViewedBidsDate)));
    const unsubTodaysBids = onSnapshot(todaysBidsQuery, (snapshot) => {
        setTodaysBidsCount(snapshot.size);
    });

    const todaysWinsQuery = query(collection(db, "bids"), where("createdAt", ">=", Timestamp.fromDate(lastViewedWinsDate)));
    const unsubTodaysWins = onSnapshot(todaysWinsQuery, (snapshot) => {
        const winningBids = snapshot.docs.filter(doc => doc.data().status === 'won');
        setTodaysWinsCount(winningBids.length);
    });


    return () => {
        unsubDeposits();
        unsubWithdrawals();
        unsubNewUsers();
        unsubTodaysBids();
        unsubTodaysWins();
    };
  }, []);

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
             <Link href="/admin/manage-users?viewed=true" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-users')} tooltip={{children: "Registered Users"}}>
                  <Users />
                  <span>Registered Users</span>
                   {newUsersCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {newUsersCount}
                    </span>
                 )}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <Link href="/admin/manage-games" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/manage-games')} tooltip={{children: "Add New Game"}}>
                    <Gamepad />
                    <span>Add New Game</span>
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
            <Link href="/admin/pending-requests" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/pending-requests')} tooltip={{children: "Customer Pending Requests"}}>
                <div className="flex items-center gap-2">
                    <MailQuestion />
                    <span>Customer Pending Requests</span>
                </div>
                 {pendingRequestsCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {pendingRequestsCount}
                    </span>
                 )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/send-notification" passHref onClick={handleLinkClick}>
              <SidebarMenuButton isActive={isActive('/admin/send-notification')} tooltip={{children: "Send Notification"}}>
                <Send />
                <span>Send Notification</span>
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
              <Link href="/admin/bid-history?viewed=true" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/bid-history')} tooltip={{children: "Bid History"}}>
                  <History />
                  <span>Bid History</span>
                   {todaysBidsCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {todaysBidsCount}
                    </span>
                 )}
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
              <Link href="/admin/win-history?viewed=true" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/win-history')} tooltip={{children: "Win History"}}>
                 <Trophy />
                 <span>Win History</span>
                  {todaysWinsCount > 0 && (
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {todaysWinsCount}
                    </span>
                 )}
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/bonus-history" passHref onClick={handleLinkClick}>
                <SidebarMenuButton isActive={isActive('/admin/bonus-history')} tooltip={{children: "Bonus History"}}>
                  <Gift />
                  <span>Bonus History</span>
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
        <div className="p-4 sm:p-6">
            {children}
        </div>
    </LayoutProvider>
  );
}
