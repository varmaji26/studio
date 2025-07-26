
'use client';

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
  SidebarGroup,
  SidebarFooter
} from '@/components/ui/sidebar';
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
  LogOut,
  Settings
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
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

  return (
    <SidebarProvider>
      <div className="dark min-h-screen bg-background text-foreground flex">
        <Sidebar variant="sidebar" collapsible="icon">
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
                <Link href="/admin" passHref>
                  <SidebarMenuButton isActive={isActive('/admin')} tooltip={{children: "Dashboard"}}>
                    <Home />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                 <Link href="/admin/manage-users" passHref>
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
                 <Link href="/admin/manage-games" passHref>
                    <SidebarMenuButton isActive={isActive('/admin/manage-games')} tooltip={{children: "Manage Games"}}>
                      <Gamepad />
                      <span>Manage Games</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Update Result (Open)"}}>
                  <CheckCircle />
                  <span>Update Result (Open)</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Update Result (Close)"}}>
                  <XCircle />
                  <span>Update Result (Close)</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "View All Load"}}>
                  <BarChart2 />
                  <span>View All Load</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Market-wise Load"}}>
                  <LineChart />
                  <span>Market-wise Load</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Bid History"}}>
                  <History />
                  <span>Bid History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Win History"}}>
                  <Trophy />
                  <span>Win History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "Find Password"}}>
                  <KeyRound />
                  <span>Find Password</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/admin/deposits" passHref>
                  <SidebarMenuButton isActive={isActive('/admin/deposits')} tooltip={{children: "Deposits/Withdrawals"}}>
                    <ArrowLeftRight />
                    <span>Deposits/Withdrawals</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton tooltip={{children: "220 Matka Pana List"}}>
                  <ClipboardList />
                  <span>220 Matka Pana List</span>
                </SidebarMenuButton>
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
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarGroup>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-card">
                    <Avatar>
                        <AvatarImage src="https://placehold.co/40x40.png" />
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
            </SidebarGroup>
          </SidebarFooter>
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
