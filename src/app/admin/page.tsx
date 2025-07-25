
'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Hand, Landmark, IndianRupee, Wallet, ArrowLeftRight, Clock } from 'lucide-react';
import { Loader } from '@/components/loader';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  changeType?: 'increase' | 'decrease';
  color?: string;
}

const StatCard = ({ title, value, icon: Icon, change, changeType, color }: StatCardProps) => (
    <Card className="bg-card/80 border-white/10 shadow-lg" style={{ borderLeft: `4px solid ${color}`}}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
           <p className={`text-xs ${changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
);


export default function AdminDashboardPage() {
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalGames, setTotalGames] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                setTotalUsers(usersSnapshot.size);

                const gamesSnapshot = await getDocs(collection(db, "games"));
                setTotalGames(gamesSnapshot.size);
            } catch (error) {
                console.error("Error fetching stats: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
            <StatCard title="Total Users" value={totalUsers.toString()} icon={Users} color="#8b5cf6" />
            <StatCard title="Total Games" value={totalGames.toString()} icon={Gamepad2} color="#ec4899" />
            <StatCard title="Total Bids" value="125" icon={Hand} color="#f97316" />
            <StatCard title="Total Market" value="11" icon={Landmark} color="#22c55e" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today's Deposits" value="₹5,420" icon={Wallet} color="#14b8a6"/>
            <StatCard title="Withdrawls Given Today" value="₹1,250" icon={ArrowLeftRight} color="#f43f5e" />
            <StatCard title="Yesterday's Deposits" value="₹8,760" icon={Clock} color="#14b8a6" />
            <StatCard title="Withdrawal Given Yesterday" value="₹4,465" icon={Clock} color="#f43f5e" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Today's Bidding" 
                value="₹68,619" 
                icon={IndianRupee} 
                change="+10% increase"
                changeType="increase"
                color="#3b82f6"
            />
            <StatCard 
                title="Today Winning" 
                value="₹76,400" 
                icon={IndianRupee}
                change="-12% decrease"
                changeType="decrease"
                color="#16a34a"
            />
            <StatCard 
                title="Today's Profit / Loss" 
                value="-₹7,781" 
                icon={IndianRupee}
                change="-15% decrease"
                changeType="decrease"
                color="#ef4444"
            />
        </div>
    </div>
  );
}
