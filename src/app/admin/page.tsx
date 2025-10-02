
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentData, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Gamepad2, Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Scale, BarChart, Banknote, Landmark } from 'lucide-react';
import { Loader } from '@/components/loader';
import { useAuth } from '@/hooks/use-auth';
import { setInitialStats } from '@/lib/stats-helper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';


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
    monthlyNetBalance: number;
}


export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AppStats>({ totalUsers: 0, totalGames: 0, totalBalance: 0 });
    const [dailyStats, setDailyStats] = useState<DailyStats>({ todaysDeposits: 0, todaysWithdrawals: 0, yesterdaysDeposits: 0, yesterdaysWithdrawals: 0 });
    const [biddingStats, setBiddingStats] = useState<BiddingStats>({ todaysBidding: 0, todaysWinning: 0, todaysProfitLoss: 0 });
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ totalBidding: 0, totalProfit: 0, totalDeposit: 0, totalWithdrawal: 0, monthlyNetBalance: 0 });
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    
    useEffect(() => {
        setInitialStats().catch(console.error);
        
        const statsDocRef = doc(db, "app-stats", "dashboard");
        const unsubscribeStats = onSnapshot(statsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(docSnap.data() as AppStats);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching stats: ", error);
            setLoading(false);
        });

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
       
        const sumApprovedAmount = (snapshot: DocumentData) => snapshot.docs
            .filter((doc: DocumentData) => doc.data().status === 'approved')
            .reduce((sum: number, doc: DocumentData) => sum + (doc.data().amount || 0), 0);

        const todayDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfToday));
        const todayWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfToday));
        const yesterdayDepositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
        const yesterdayWithdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfYesterday), where("createdAt", "<", startOfToday));
        const bidsQuery = query(collection(db, "bids"), where("createdAt", ">=", startOfToday));

        const unsubTodayDeposits = onSnapshot(todayDepositsQuery, (snap) => setDailyStats(s => ({ ...s, todaysDeposits: sumApprovedAmount(snap) })));
        const unsubTodayWithdrawals = onSnapshot(todayWithdrawalsQuery, (snap) => setDailyStats(s => ({ ...s, todaysWithdrawals: sumApprovedAmount(snap) })));
        const unsubYesterdayDeposits = onSnapshot(yesterdayDepositsQuery, (snap) => setDailyStats(s => ({ ...s, yesterdaysDeposits: sumApprovedAmount(snap) })));
        const unsubYesterdayWithdrawals = onSnapshot(yesterdayWithdrawalsQuery, (snap) => setDailyStats(s => ({ ...s, yesterdaysWithdrawals: sumApprovedAmount(snap) })));

        const unsubBids = onSnapshot(bidsQuery, (bidsSnap) => {
            let todaysBidding = 0;
            let todaysWinning = 0;

            bidsSnap.forEach(doc => {
                const bid = doc.data();
                todaysBidding += bid.totalAmount || 0;
                if (bid.status === 'won') {
                    todaysWinning += bid.winningAmount || 0;
                }
            });
            setBiddingStats({
                todaysBidding,
                todaysWinning,
                todaysProfitLoss: todaysBidding - todaysWinning
            });
        });

        return () => {
            unsubscribeStats();
            unsubTodayDeposits();
            unsubTodayWithdrawals();
            unsubYesterdayDeposits();
            unsubYesterdayWithdrawals();
            unsubBids();
        };
    }, []);

    useEffect(() => {
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth) - 1;

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        const sumApprovedAmount = (snapshot: DocumentData) => snapshot.docs
            .filter((doc: DocumentData) => doc.data().status === 'approved')
            .reduce((sum: number, doc: DocumentData) => sum + (doc.data().amount || 0), 0);

        const depositsQuery = query(collection(db, "deposits"), where("createdAt", ">=", startOfMonth), where("createdAt", "<=", endOfMonth));
        const withdrawalsQuery = query(collection(db, "withdrawals"), where("createdAt", ">=", startOfMonth), where("createdAt", "<=", endOfMonth));
        const bidsQuery = query(collection(db, "bids"), where("createdAt", ">=", startOfMonth), where("createdAt", "<=", endOfMonth));
        
        const unsubDeposits = onSnapshot(depositsQuery, (snap) => {
            const totalDeposit = sumApprovedAmount(snap);
            setMonthlyStats(s => ({ ...s, totalDeposit, monthlyNetBalance: totalDeposit - s.totalWithdrawal }));
        });

        const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snap) => {
            const totalWithdrawal = sumApprovedAmount(snap);
            setMonthlyStats(s => ({ ...s, totalWithdrawal, monthlyNetBalance: s.totalDeposit - totalWithdrawal }));
        });

        const unsubBids = onSnapshot(bidsQuery, (bidsSnap) => {
            let monthBidding = 0;
            let monthWinning = 0;

            bidsSnap.forEach(doc => {
                const bid = doc.data();
                monthBidding += bid.totalAmount || 0;
                if (bid.status === 'won') {
                    monthWinning += bid.winningAmount || 0;
                }
            });
            setMonthlyStats(s => ({
                ...s,
                totalBidding: monthBidding,
                totalProfit: monthBidding - monthWinning,
            }));
        });

        return () => {
            unsubDeposits();
            unsubWithdrawals();
            unsubBids();
        }
    }, [selectedMonth, selectedYear]);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

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
                    value={`₹${monthlyStats.monthlyNetBalance.toLocaleString()}`} 
                    icon={Landmark} 
                    color={monthlyStats.monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                    textColor={monthlyStats.monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                />
            </div>
        </div>
        
        <div>
            <h3 className="text-xl font-bold mb-4">Daily Transaction Report</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Today's Deposits" value={`₹${dailyStats.todaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#3b82f6" />
                <StatCard title="Withdrawals Given Today" value={`₹${dailyStats.todaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#f97316" />
                <StatCard title="Yesterday's Deposits" value={`₹${dailyStats.yesterdaysDeposits.toLocaleString()}`} icon={ArrowUpCircle} color="#10b981" />
                <StatCard title="Withdrawal Given Yesterday" value={`₹${dailyStats.yesterdaysWithdrawals.toLocaleString()}`} icon={ArrowDownCircle} color="#ef4444" />
            </div>
        </div>
        
        <div>
            <h3 className="text-xl font-bold mb-4">Daily Bidding Report</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
        
         <div>
            <h3 className="text-xl font-bold mb-4">This Month's Report</h3>
             <div className="flex items-center gap-2 mb-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total Deposit" value={`₹${monthlyStats.totalDeposit.toLocaleString()}`} icon={ArrowUpCircle} color="#3b82f6" />
                <StatCard title="Total Withdrawal" value={`₹${monthlyStats.totalWithdrawal.toLocaleString()}`} icon={ArrowDownCircle} color="#f97316" />
                <StatCard title="Total Bidding" value={`₹${monthlyStats.totalBidding.toLocaleString()}`} icon={BarChart} color="#a855f7" />
                <StatCard 
                    title="Total Profit" 
                    value={`₹${monthlyStats.totalProfit.toLocaleString()}`} 
                    icon={Scale} 
                    color={monthlyStats.totalProfit >= 0 ? "#22c55e" : "#ef4444"}
                    textColor={monthlyStats.totalProfit >= 0 ? "#22c55e" : "#ef4444"}
                />
            </div>
        </div>

      </div>
    </div>
  );
}
