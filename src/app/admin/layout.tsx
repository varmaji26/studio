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


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarItems = (
    <>
      <div className="flex items-center gap-2 p-4">
        <div className="p-1.5 rounded-lg bg-primary">
            <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-primary-foreground">Matka Genius</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          <li>
            <a href="/admin" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <Home />
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="/admin/manage-users" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <Users />
              <span>Manage Users</span>
            </a>
          </li>
           <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <Building />
              <span>Market</span>
            </a>
          </li>
          <li>
            <a href="/admin/manage-games" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <Gamepad />
              <span>Manage Games</span>
            </a>
          </li>
          <li>
            <a href="/admin/manage-banners" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <ImageIcon />
              <span>Manage Banners</span>
            </a>
          </li>
          <li>
            <a href="/admin/update-results" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <CheckCircle />
              <span>Update Result</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <XCircle />
              <span>Update Result (Close)</span>
            </a>
          </li>
          <li>
            <a href="/admin/charts" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <BarChart2 />
              <span>Game Charts</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <LineChart />
              <span>Market-wise Load</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <History />
              <span>Bid History</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <Trophy />
              <span>Win History</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <KeyRound />
              <span>Find Password</span>
            </a>
          </li>
          <li>
            <a href="/admin/deposits" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <ArrowLeftRight />
              <span>Deposits/Withdrawals</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <ClipboardList />
              <span>220 Matka Pana List</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <UserCheck />
              <span>Registered Users</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/10 transition-colors text-sm">
              <CreditCard />
              <span>Payment</span>
            </a>
          </li>
        </ul>
      </div>
       <div className="p-2">
        {/* User profile section will be handled by the client component */}
      </div>
    </>
  );

  return (
    <LayoutProvider sidebarContent={sidebarItems}>
      {children}
    </LayoutProvider>
  );
}
