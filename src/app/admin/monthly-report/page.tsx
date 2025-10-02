
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, Timestamp, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { Banknote, BarChart, Scale, ArrowDownCircle, ArrowUpCircle, Download, Landmark } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  textColor?: string;
}

interface MonthlyStats {
    totalBidding: number;
    totalProfit: number;
    totalDeposit: number;
    totalWithdrawal: number;
    monthlyNetBalance: number;
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

// Extend jsPDF with autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function MonthlyReportPage() {
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ totalBidding: 0, totalProfit: 0, totalDeposit: 0, totalWithdrawal: 0, monthlyNetBalance: 0 });
    const [loading, setLoading] = useState(true);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());

    useEffect(() => {
        setLoading(true);
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
            setLoading(false);
        });

        return () => {
            unsubDeposits();
            unsubWithdrawals();
            unsubBids();
        }
    }, [selectedMonth, selectedYear]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'long' });
        doc.text(`Monthly Report - ${monthName} ${selectedYear}`, 14, 16);

        const tableColumn = ["Metric", "Amount (₹)"];
        const tableRows = [
            ["Monthly Net Balance", monthlyStats.monthlyNetBalance.toLocaleString()],
        ];

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 24,
            headStyles: { fillColor: [22, 163, 74] },
        });

        doc.save(`monthly-report-${selectedYear}-${selectedMonth}.pdf`);
    };

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="flex-1 space-y-6">
            <Card className="bg-card/80 border-white/10 shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-3xl font-bold">Monthly Report</CardTitle>
                        </div>
                        <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-6">
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
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader />
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                             <StatCard 
                                title="Monthly Net Balance" 
                                value={`₹${monthlyStats.monthlyNetBalance.toLocaleString()}`} 
                                icon={Landmark} 
                                color={monthlyStats.monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                                textColor={monthlyStats.monthlyNetBalance >= 0 ? "#22c55e" : "#ef4444"}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
