
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Wallet } from 'lucide-react';
import { Loader } from '@/components/loader';
import { useAuth } from '@/hooks/use-auth';

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
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalUsers: 0, totalGames: 0, totalBalance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usersQuery = query(collection(db, "users"));
        const gamesQuery = query(collection(db, "games"));

        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            let totalBalance = 0;
            snapshot.forEach((doc: DocumentData) => {
                totalBalance += doc.data().balance || 0;
            });
            setStats(prevStats => ({
                ...prevStats,
                totalUsers: snapshot.size,
                totalBalance: totalBalance,
            }));
             if(loading) setLoading(false);
        }, (error) => {
            console.error("Error fetching users: ", error);
             if(loading) setLoading(false);
        });
        
        const unsubscribeGames = onSnapshot(gamesQuery, (snapshot) => {
            setStats(prevStats => ({
                ...prevStats,
                totalGames: snapshot.size,
            }));
        }, (error) => {
            console.error("Error fetching games: ", error);
        });

        // One-time check to set admin balance
        const setAdminBalance = async () => {
          if (user && user.email === '8080601370@authcanvas.dev') {
            const adminUserRef = doc(db, 'users', user.uid);
            try {
              await runTransaction(db, async (transaction) => {
                const adminDoc = await transaction.get(adminUserRef);
                if (adminDoc.exists()) {
                  const currentBalance = adminDoc.data().balance || 0;
                  if (currentBalance === 0) {
                     transaction.update(adminUserRef, { balance: 50000 });
                  }
                }
              });
            } catch (e) {
              console.error("Failed to set admin balance", e);
            }
          }
        };

        if(user) {
          setAdminBalance();
        }

        return () => {
            unsubscribeUsers();
            unsubscribeGames();
        };
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
