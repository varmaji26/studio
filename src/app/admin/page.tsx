
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Wallet } from 'lucide-react';
import { Loader } from '@/components/loader';
import { useAuth } from '@/hooks/use-auth';
import { setInitialStats } from '@/lib/stats-helper';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: string;
}

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
    <Card className="bg-card/80 border-white/10 shadow-lg" style={{ borderLeft: `4px solid ${color}`}}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
);

interface AppStats {
    totalUsers: number;
    totalGames: number;
    totalBalance: number;
}

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AppStats>({ totalUsers: 0, totalGames: 0, totalBalance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Run this once to initialize stats if they don't exist
        setInitialStats().catch(console.error);
        
        const statsDocRef = doc(db, "app-stats", "dashboard");

        const unsubscribe = onSnapshot(statsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(docSnap.data() as AppStats);
            } else {
                console.log("No stats document! Initializing...");
                // The setInitialStats function will handle creation.
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching stats: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
          <div className="flex h-full flex-1 items-center justify-center bg-background p-8">
            <Loader className="h-10 w-10 text-primary" />
          </div>
        );
    }
  
  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8">
        <div className="bg-teal-500 text-white p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold">Welcome to your Admin Panel!</h2>
            <p className="mt-1">Here's a detailed overview of your application's status and performance.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={stats.totalUsers.toString()} icon={Users} color="#8b5cf6" />
            <StatCard title="Total Games" value={stats.totalGames.toString()} icon={Gamepad2} color="#ec4899" />
            <StatCard title="Total Balance" value={`₹${stats.totalBalance.toLocaleString()}`} icon={Wallet} color="#22c55e" />
        </div>
    </div>
  );
}
