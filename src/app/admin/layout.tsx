
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
  ImageIcon
} from 'lucide-react';
import { LayoutProvider } from '@/components/layout-provider';
import { SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const isActive = (path: string) => pathname === path;
  
  const handleLinkClick = () => {
    setIsSidebarOpen(false);
  };

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
              <SidebarMenuButton isActive={isActive('/admin')} tooltip={{children: "Dashboard"}}>
                <Home />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
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
              <SidebarMenuButton isActive={isActive('/admin/update-results')} tooltip={{children: "Update Result"}}>
                <CheckCircle />
                <span>Update Result</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton tooltip={{children: "Update Result (Close)"}}>
              <XCircle />
              <span>Update Result (Close)</span>
            </SidebarMenuButton>
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
            <SidebarMenuButton tooltip={{children: "Market-wise Load"}}>
              <LineChart />
              <span>Market-wise Load</span>
            </SidebarMenuButton>
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
            <SidebarMenuButton tooltip={{children: "Find Password"}}>
              <KeyRound />
              <span>Find Password</span>
            </SidebarMenuButton>
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
