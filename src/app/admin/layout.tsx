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


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <Link href="/admin" passHref>
              <SidebarMenuButton tooltip={{children: "Dashboard"}}>
                <Home />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <Link href="/admin/manage-users" passHref>
                <SidebarMenuButton tooltip={{children: "Manage Users"}}>
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
                <SidebarMenuButton tooltip={{children: "Manage Games"}}>
                    <Gamepad />
                    <span>Manage Games</span>
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/manage-banners" passHref>
                <SidebarMenuButton tooltip={{children: "Manage Banners"}}>
                    <ImageIcon />
                    <span>Manage Banners</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/admin/update-results" passHref>
              <SidebarMenuButton tooltip={{children: "Update Result"}}>
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
            <Link href="/admin/charts" passHref>
                <SidebarMenuButton tooltip={{children: "Game Charts"}}>
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
              <SidebarMenuButton tooltip={{children: "Deposits/Withdrawals"}}>
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
    </>
  );

  return (
    <LayoutProvider sidebarContent={sidebarItems}>
      {children}
    </LayoutProvider>
  );
}
