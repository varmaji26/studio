
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Scale, CalendarDays, BarChart, Banknote } from 'lucide-react';
import { Loader } from '@/components/loader';
import { useAuth } from '@/hooks/use-auth';
import { setInitialStats } from '@/lib/stats-helper';

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

interface MonthlyStats {
    totalBidding: number;
    totalProfit: number;
    totalDeposit: number;
    totalWithdrawal: number;
}


export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AppStats>({ totalUsers: 0, totalGames: 0, totalBalance: 0 });
    const [dailyStats, setDailyStats] = useState<DailyStats>({ todaysDeposits: 0, todaysWithdrawals: 0, yesterdaysDeposits: 0, yesterdaysWithdrawals: 0 });
    const [biddingStats, setBiddingStats] = useState<BiddingStats>({ todaysBidding: 0, todaysWinning: 0, todaysProfitLoss: 0 });
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ totalBidding: 0, totalProfit: 0, totalDeposit: 0, totalWithdrawal: 0 });
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
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching stats: ", error);
            setLoading(false);
        });

        const fetchDailyAndBiddingStats = async () => {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            
            const todayDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfToday));
            const todayWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfToday));
            const yesterdayDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
            const yesterdayWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
            const todayBidsQuery = query(collection(db, "bids"), where("createdAt", ">=", startOfToday));
            
            // Monthly queries
            const monthBidsQuery = query(collection(db, "bids"), where("createdAt", ">=", startOfMonth));
            const monthDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfMonth));
            const monthWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfMonth));


            try {
                const [
                    todayDepositsSnap,
                    todayWithdrawalsSnap,
                    yesterdayDepositsSnap,
                    yesterdayWithdrawalsSnap,
                    todayBidsSnap,
                    monthBidsSnap,
                    monthDepositsSnap,
                    monthWithdrawalsSnap
                ] = await Promise.all([
                    getDocs(todayDepositsQuery),
                    getDocs(todayWithdrawalsQuery),
                    getDocs(yesterdayDepositsQuery),
                    getDocs(yesterdayWithdrawalsQuery),
                    getDocs(todayBidsQuery),
                    getDocs(monthBidsQuery),
                    getDocs(monthDepositsQuery),
                    getDocs(monthWithdrawalsQuery)
                ]);
                
                const sumApprovedAmount = (snapshot: DocumentData) => snapshot.docs
                    .filter((doc: DocumentData) => doc.data().status === 'approved')
                    .reduce((sum: number, doc: DocumentData) => sum + (doc.data().amount || 0), 0);
                
                let todaysBidding = 0;
                let todaysWinning = 0;
                todayBidsSnap.forEach(doc => {
                    const bid = doc.data();
                    todaysBidding += bid.totalAmount || 0;
                    if (bid.status === 'won') {
                        todaysWinning += bid.winningAmount || 0;
                    }
                });
                
                let monthBidding = 0;
                let monthWinning = 0;
                monthBidsSnap.forEach(doc => {
                    const bid = doc.data();
                    monthBidding += bid.totalAmount || 0;
                    if (bid.status === 'won') {
                        monthWinning += bid.winningAmount || 0;
                    }
                });

                setDailyStats({
                    todaysDeposits: sumApprovedAmount(todayDepositsSnap),
                    todaysWithdrawals: sumApprovedAmount(todayWithdrawalsSnap),
                    yesterdaysDeposits: sumApprovedAmount(yesterdayDepositsSnap),
                    yesterdaysWithdrawals: sumApprovedAmount(yesterdayWithdrawalsSnap)
                });
                
                setBiddingStats({
                    todaysBidding,
                    todaysWinning,
                    todaysProfitLoss: todaysBidding - todaysWinning
                });
                
                setMonthlyStats({
                    totalBidding: monthBidding,
                    totalProfit: monthBidding - monthWinning,
                    totalDeposit: sumApprovedAmount(monthDepositsSnap),
                    totalWithdrawal: sumApprovedAmount(monthWithdrawalsSnap),
                });


            } catch (error) {
                console.error("Error fetching daily stats: ", error);
            }
        }

        fetchDailyAndBiddingStats();

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
    <div className="flex-1 space-y-8 p-4 sm:p-8">
        <div className="bg-teal-500 text-white p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold">Welcome to your Admin Panel!</h2>
            <p className="mt-1">Here's a detailed overview of your application's status and performance.</p>
        </div>

        <h3 className="text-xl font-bold">Overall Stats</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={stats.totalUsers.toString()} icon={Users} color="#8b5cf6" />
            <StatCard title="Total Games" value={stats.totalGames.toString()} icon={Gamepad2} color="#ec4899" />
            <StatCard title="Total Money in Users' Wallet" value={`₹${stats.totalBalance.toLocaleString()}`} icon={Wallet} color="#22c55e" />
        </div>
        
        <h3 className="text-xl font-bold mt-8">Daily Transaction & Bidding Report</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today's Deposits" value={`₹${dailyStats.todaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#3b82f6" />
            <StatCard title="Withdrawals Given Today" value={`₹${dailyStats.todaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#f97316" />
            <StatCard title="Yesterday's Deposits" value={`₹${dailyStats.yesterdaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#10b981" />
            <StatCard title="Withdrawal Given Yesterday" value={`₹${dailyStats.yesterdaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#ef4444" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <StatCard title="Today's Bidding" value={`₹${biddingStats.todaysBidding.toLocaleString()}`} icon={TrendingUp} color="#38bdf8" />
            <StatCard title="Today's Winning" value={`₹${biddingStats.todaysWinning.toLocaleString()}`} icon={TrendingDown} color="#fb7185" />
            <StatCard 
                title="Today's Profit / Loss" 
                value={`₹${biddingStats.todaysProfitLoss.toLocaleString()}`} 
                icon={Scale} 
                color={biddingStats.todaysProfitLoss >= 0 ? "#4ade80" : "#f87171"}
                textColor={biddingStats.todaysProfitLoss >= 0 ? "#4ade80" : "#f87171"}
            />
        </div>
        
        <h3 className="text-xl font-bold mt-8">This Month's Report</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Bidding This Month" value={`₹${monthlyStats.totalBidding.toLocaleString()}`} icon={BarChart} color="#a855f7" />
            <StatCard 
                title="Total Profit This Month" 
                value={`₹${monthlyStats.totalProfit.toLocaleString()}`} 
                icon={Scale} 
                color={monthlyStats.totalProfit >= 0 ? "#22c55e" : "#ef4444"}
                textColor={monthlyStats.totalProfit >= 0 ? "#22c55e" : "#ef4444"}
            />
            <StatCard title="Total Deposit This Month" value={`₹${monthlyStats.totalDeposit.toLocaleString()}`} icon={Banknote} color="#3b82f6" />
            <StatCard title="Total Withdrawls This Month" value={`₹${monthlyStats.totalWithdrawal.toLocaleString()}`} icon={ArrowDownCircle} color="#f97316" />
        </div>
    </div>
  );
}
