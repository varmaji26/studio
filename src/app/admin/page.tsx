'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData, collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Scale, BarChart, Banknote, Landmark } from 'lucide-react';
import { Loader } from '@/components/loader';
import { useAuth } from '@/hooks/use-auth';


interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  textColor?: string;
}

const StatCard = ({ title, value, icon: Icon, color, textColor }: StatCardProps) => (
    <Card className="bg-card/80 border-white/10 shadow-lg" style={{ borderLeft: `4px solid ${color}`}}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: textColor }}>{value}</div>
      </CardContent>
    </Card>
);

interface AppStats {
    totalUsers: number;
    totalGames: number;
    totalBalance: number;
}

interface DailyStats {
    todaysDeposits: number;
    todaysWithdrawals: number;
    yesterdaysDeposits: number;
    yesterdaysWithdrawals: number;
}

interface BiddingStats {
    todaysBidding: number;
    todaysWinning: number;
    todaysProfitLoss: number;
}


export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AppStats>({ totalUsers: 0, totalGames: 0, totalBalance: 0 });
    const [dailyStats, setDailyStats] = useState<DailyStats>({ todaysDeposits: 0, todaysWithdrawals: 0, yesterdaysDeposits: 0, yesterdaysWithdrawals: 0 });
    const [biddingStats, setBiddingStats] = useState<BiddingStats>({ todaysBidding: 0, todaysWinning: 0, todaysProfitLoss: 0 });
    const [monthlyNetBalance, setMonthlyNetBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchAllStats = async () => {
            setLoading(true);
            try {
                // --- Base Stats (can remain onSnapshot for semi-realtime) ---
                const statsDocRef = doc(db, "app-stats", "dashboard");
                const unsubStats = onSnapshot(statsDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setStats(docSnap.data() as AppStats);
                    }
                });

                // --- Time-based Calculations ---
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
       
                const sumApprovedAmount = (docs: DocumentData[]) => docs
                    .filter((doc) => doc.status === 'approved')
                    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

                // --- Queries ---
                const yesterdayDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
                const yesterdayWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
                const todayBidsQuery = query(collection(db, "bids"), where("createdAt", ">=", startOfToday));
                const monthDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfMonth));
                const monthWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfMonth));

                // --- Fetch all data at once ---
                const [
                    yesterdayDepositsSnap,
                    yesterdayWithdrawalsSnap,
                    todayBidsSnap,
                    monthDepositsSnap,
                    monthWithdrawalsSnap
                ] = await Promise.all([
                    getDocs(yesterdayDepositsQuery),
                    getDocs(yesterdayWithdrawalsQuery),
                    getDocs(todayBidsQuery),
                    getDocs(monthDepositsQuery),
                    getDocs(monthWithdrawalsQuery),
                ]);

                // --- Process all fetched data ---
                const monthDepositsDocs = monthDepositsSnap.docs.map(d => d.data());
                const todaysDepositsDocs = monthDepositsDocs.filter(d => d.createdAt.toDate() >= startOfToday);
                const todaysDeposits = sumApprovedAmount(todaysDepositsDocs);
                const totalMonthDeposit = sumApprovedAmount(monthDepositsDocs);
                
                const monthWithdrawalsDocs = monthWithdrawalsSnap.docs.map(d => d.data());
                const todaysWithdrawalsDocs = monthWithdrawalsDocs.filter(d => d.createdAt.toDate() >= startOfToday);
                const todaysWithdrawals = sumApprovedAmount(todaysWithdrawalsDocs);
                const totalMonthWithdrawal = sumApprovedAmount(monthWithdrawalsDocs);

                const yesterdaysDeposits = sumApprovedAmount(yesterdayDepositsSnap.docs.map(d => d.data()));
                const yesterdaysWithdrawals = sumApprovedAmount(yesterdayWithdrawalsSnap.docs.map(d => d.data()));
                setDailyStats({ todaysDeposits, todaysWithdrawals, yesterdaysDeposits, yesterdaysWithdrawals });

                setMonthlyNetBalance(totalMonthDeposit - totalMonthWithdrawal);

                // Bidding Stats (Today)
                let todaysBidding = 0;
                let todaysWinning = 0;
                todayBidsSnap.docs.forEach(bidDoc => {
                    const bid = bidDoc.data();
                    if (bid.status !== 'cancelled') {
                        todaysBidding += bid.totalAmount || 0;
                    }
                    if (bid.status === 'won') {
                        todaysWinning += bid.winningAmount || 0;
                    }
                });
                setBiddingStats({ todaysBidding, todaysWinning, todaysProfitLoss: todaysBidding - todaysWinning });
                
                setLoading(false);

                // Return the stats unsubscribe function for cleanup
                return unsubStats;

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                setLoading(false);
            }
        };

        let unsub: (() => void) | undefined;
        fetchAllStats().then(unsubscribe => {
            unsub = unsubscribe;
        });

        // Cleanup function for useEffect
        return () => {
            unsub?.();
        };

    }, []);

    if (loading) {
        return (
          <div className="flex h-full flex-1 items-center justify-center bg-background p-8">
            <Loader className="h-10 w-10 text-primary" />
          </div>
        );
    }
  
  return (
    <div className="flex-1 space-y-6">
       <div className="grid gap-6">
        <div className="bg-teal-500 text-white p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold">Welcome to your Admin Panel!</h2>
            <p className="mt-1">Here's a detailed overview of your application's status and performance.</p>
        </div>

        <div>
            <h3 className="text-xl font-bold mb-4">Overall Stats</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total Users" value={stats.totalUsers.toString()} icon={Users} color="#8b5cf6" />
                <StatCard title="Total Games" value={stats.totalGames.toString()} icon={Gamepad2} color="#ec4899" />
                <StatCard 
                    title="Monthly Net Balance" 
                    value={`₹${monthlyNetBalance.toLocaleString()}`} 
                    icon={Landmark} 
                    color={monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                    textColor={monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                />
            </div>
        </div>
        
        <div>
            <h3 className="text-xl font-bold mb-4">Daily Transaction &amp; Bidding Report</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Today's Deposits" value={`₹${dailyStats.todaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#3b82f6" />
                <StatCard title="Withdrawals Given Today" value={`₹${dailyStats.todaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#f97316" />
                <StatCard title="Today's Bidding" value={`₹${biddingStats.todaysBidding.toLocaleString()}`} icon={TrendingUp} color="#38bdf8" />
                <StatCard title="Today's Winning" value={`₹${biddingStats.todaysWinning.toLocaleString()}`} icon={TrendingDown} color="#fb7185" />
                <StatCard 
                    title="Today's Profit / Loss" 
                    value={`₹${biddingStats.todaysProfitLoss.toLocaleString()}`} 
                    icon={Scale} 
                    color={biddingStats.todaysProfitLoss >= 0 ? "#4ade80" : "#f87171"}
                    textColor={biddingStats.todaysProfitLoss >= 0 ? "#4ade80" : "#f87171"}
                />
                <StatCard title="Yesterday's Deposits" value={`₹${dailyStats.yesterdaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#10b981" />
                <StatCard title="Withdrawal Given Yesterday" value={`₹${dailyStats.yesterdaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#ef4444" />
            </div>
        </div>

      </div>
    </div>
  );
}
