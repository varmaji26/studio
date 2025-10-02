
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
  Sun,
  Moon,
  PieChart,
} from 'lucide-react';
import { LayoutProvider } from '@/components/layout-provider';
import { SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
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
  const [pendingDepositsCount, setPendingDepositsCount] = React.useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = React.useState(0);
  const [newUsersCount, setNewUsersCount] = React.useState(0);
  const [todaysBidsCount, setTodaysBidsCount] = React.useState(0);
  const [todaysWinsCount, setTodaysWinsCount] = React.useState(0);
  const [theme, setTheme] = React.useState('light');
  
  const isActive = (path: string) => pathname === path;

  const isLoadMenuInitiallyOpen = isActive('/admin/view-open-load') || isActive('/admin/view-close-load') || isActive('/admin/view-gametype-load');
  const [isLoadMenuOpen, setIsLoadMenuOpen] = React.useState(isLoadMenuInitiallyOpen);
  
  const isRequestsMenuInitiallyOpen = isActive('/admin/deposit-requests') || isActive('/admin/withdrawal-requests');
  const [isRequestsMenuOpen, setRequestsMenuOpen] = React.useState(isRequestsMenuInitiallyOpen);
  
  const isPaymentHistoryMenuInitiallyOpen = isActive('/admin/deposit-history') || isActive('/admin/withdrawal-history');
  const [isPaymentHistoryMenuOpen, setPaymentHistoryMenuOpen] = React.useState(isPaymentHistoryMenuInitiallyOpen);


  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    // Check if storedTheme is not null and not an empty string before parsing
    if (storedTheme) {
        try {
            const currentTheme = JSON.parse(storedTheme);
            setTheme(currentTheme);
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(currentTheme);
        } catch (error) {
            console.error("Failed to parse theme from localStorage", error);
            // Fallback to default theme if parsing fails
            setTheme('light');
            document.documentElement.classList.add('light');
        }
    } else {
        // Default theme if nothing is in localStorage
        setTheme('light');
        document.documentElement.classList.add('light');
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('theme', JSON.stringify(newTheme));
  };

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

    const unsubDeposits = onSnapshot(depositsQuery, (snapshot) => {
        setPendingDepositsCount(snapshot.size);
    });

    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
        setPendingWithdrawalsCount(snapshot.size);
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
  
  const handleBadgeClick = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    handleLinkClick();
    setter(0);
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
        <Loader className="h-20 w-20 text-primary" />
      </div>
    );
  }
  
  return (
    <LayoutProvider>
      <Sidebar>
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
                        <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/view-open-load')}>                        
                            <span>View Open Load</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <Link href="/admin/view-close-load" passHref onClick={handleLinkClick}>
                        <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/view-close-load')}>                        
                            <span>View Close Load</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                       <SidebarMenuItem>
                        <Link href="/admin/view-gametype-load" passHref onClick={handleLinkClick}>
                          <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/view-gametype-load')}>
                            <span>View Game-Type wise Load</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                  </CollapsibleContent>
               </Collapsible>
              <SidebarMenuItem>
                 <Link href="/admin/manage-users?viewed=true" passHref onClick={() => handleBadgeClick(setNewUsersCount)}>
                    <SidebarMenuButton isActive={isActive('/admin/manage-users')} tooltip={{children: "Registered Users"}}>
                      <div className="flex items-center gap-2">
                        <Users />
                        <span>Registered Users</span>
                      </div>
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
               <Collapsible open={isRequestsMenuOpen} onOpenChange={setRequestsMenuOpen}>
                  <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                         <SidebarMenuButton 
                            isActive={isRequestsMenuInitiallyOpen} 
                            className="w-full justify-between"
                         >
                            <div className="flex items-center gap-2">
                                <MailQuestion />
                                <span>Customer Requests</span>
                            </div>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isRequestsMenuOpen && "rotate-180")} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="space-y-1 ml-6 mt-1 border-l border-muted pl-4">
                     <SidebarMenuItem>
                        <Link href="/admin/deposit-requests" passHref onClick={() => handleBadgeClick(setPendingDepositsCount)}>
                        <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/deposit-requests')}>                        
                            <div className="flex items-center justify-between w-full">
                                <span>Deposit Requests</span>
                                {pendingDepositsCount > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                        {pendingDepositsCount}
                                    </span>
                                )}
                            </div>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <Link href="/admin/withdrawal-requests" passHref onClick={() => handleBadgeClick(setPendingWithdrawalsCount)}>
                        <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/withdrawal-requests')}>                        
                             <div className="flex items-center justify-between w-full">
                                <span>Withdrawal Requests</span>
                                {pendingWithdrawalsCount > 0 && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                        {pendingWithdrawalsCount}
                                    </span>
                                )}
                            </div>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                  </CollapsibleContent>
               </Collapsible>
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
                  <Link href="/admin/bid-history?viewed=true" passHref onClick={() => handleBadgeClick(setTodaysBidsCount)}>
                    <SidebarMenuButton isActive={isActive('/admin/bid-history')} tooltip={{children: "Bid History"}}>
                      <div className="flex items-center gap-2">
                        <History />
                        <span>Bid History</span>
                      </div>
                       {todaysBidsCount > 0 && (
                        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {todaysBidsCount}
                        </span>
                     )}
                    </SidebarMenuButton>
                  </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <Link href="/admin/win-history?viewed=true" passHref onClick={() => handleBadgeClick(setTodaysWinsCount)}>
                    <SidebarMenuButton isActive={isActive('/admin/win-history')} tooltip={{children: "Win History"}}>
                      <div className="flex items-center gap-2">
                        <Trophy />
                        <span>Win History</span>
                      </div>
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
                <Collapsible open={isPaymentHistoryMenuOpen} onOpenChange={setPaymentHistoryMenuOpen}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                isActive={isPaymentHistoryMenuInitiallyOpen}
                                className="w-full justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <CreditCard />
                                    <span>Payment History</span>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isPaymentHistoryMenuOpen && "rotate-180")} />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent className="space-y-1 ml-6 mt-1 border-l border-muted pl-4">
                        <SidebarMenuItem>
                            <Link href="/admin/deposit-history" passHref onClick={handleLinkClick}>
                                <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/deposit-history')}>
                                    <ArrowUpCircle className="h-4 w-4" />
                                    <span>Deposit History</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/admin/withdrawal-history" passHref onClick={handleLinkClick}>
                                <SidebarMenuButton size="sm" variant="default" isActive={isActive('/admin/withdrawal-history')}>
                                    <ArrowDownCircle className="h-4 w-4" />
                                    <span>Withdrawal History</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </CollapsibleContent>
                </Collapsible>
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
                    <Button variant="default" size="icon" className="ml-auto" onClick={handleLogout}>
                        <LogOut />
                    </Button>
                </div>
          </SidebarFooter>
      </Sidebar>
      <main className="flex-1">
        <header className="flex items-center justify-between p-4 bg-background border-b sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <h2 className="text-xl font-semibold capitalize hidden sm:block">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h2>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="default" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-6 w-6 text-yellow-400" /> : <Moon className="h-6 w-6 text-blue-400" />}
              </Button>
              <Link href="/">
                <Button className="bg-green-500 text-white hover:bg-green-600">
                  <Home className="mr-2 h-4 w-4" />
                  Go to User Panel
                </Button>
              </Link>
              <Link href="/admin/settings">
                  <Button variant="default" size="icon">
                    <Settings />
                  </Button>
              </Link>
            </div>
        </header>
        <div className="p-4 sm:p-6">
            {children}
        </div>
      </main>
    </LayoutProvider>
  );
}
