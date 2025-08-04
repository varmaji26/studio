
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PanelChartData extends DocumentData {
  id: string;
  gameName: string;
  title: string;
  data: string;
}

const isRedNumber = (num: string) => {
    if (!num || num === '*' || num.length !== 2) return false;
    const digits = num.split('');
    if (digits.length !== 2 || isNaN(parseInt(digits[0])) || isNaN(parseInt(digits[1]))) return false;
    const [first, second] = [parseInt(digits[0]), parseInt(digits[1])];
    const diff = Math.abs(first - second);
    return diff === 5 || first === second;
};

const DayCell = ({ jodi, openPana, closePana }: { jodi: string, openPana: string, closePana: string }) => {
    if (jodi === '*') {
      return <div className="p-1 min-h-[50px] flex items-center justify-center text-black font-bold">*</div>;
    }
    const isRed = isRedNumber(jodi);
    return (
        <div className="flex flex-col items-center justify-center p-1 min-h-[50px]">
            <span className="text-xs text-black">{openPana}</span>
            <span className={`font-bold text-lg ${isRed ? 'text-red-600' : 'text-black'}`}>{jodi}</span>
            <span className="text-xs text-black">{closePana}</span>
        </div>
    );
};

export default function PanelChartPage() {
    const { gameId } = useParams();
    const [chartData, setChartData] = useState<PanelChartData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof gameId !== 'string') return;

        const fetchChartData = async () => {
            setLoading(true);
            try {
                const chartDocRef = doc(db, 'panelCharts', gameId);
                const chartDoc = await getDoc(chartDocRef);
                if (chartDoc.exists()) {
                    setChartData({ id: chartDoc.id, ...chartDoc.data() } as PanelChartData);
                } else {
                    setChartData(null);
                }
            } catch (error) {
                console.error("Error fetching Panel chart data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [gameId]);

    const parsedRows = chartData?.data.split('\n').filter(row => row.trim() !== '') || [];

    if (loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-2 sm:p-4">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
                            {chartData?.title || `Panel Chart`}
                        </CardTitle>
                        <CardDescription>
                            Historical Panel Records
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/" className="inline-flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                        {chartData ? (
                            <div className="overflow-x-auto border-2 border-yellow-600 bg-orange-100">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-blue-800 text-white font-bold">
                                            <th className="p-2 border border-yellow-600">Date</th>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <th key={day} className="p-2 border border-yellow-600">{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="text-center">
                                        {parsedRows.map((row, rowIndex) => {
                                            const cols = row.split(/\s+/).filter(d => d);
                                            
                                            // Improved parsing for date range
                                            let dateRange = "N/A";
                                            let weekData = [];
                                            const toIndex = cols.indexOf('To');
                                            if (toIndex === 1 && cols.length >= 3) {
                                                dateRange = `${cols[0]} To ${cols[2]}`;
                                                weekData = cols.slice(3);
                                            } else {
                                                // Fallback if "To" is not found or in an unexpected position
                                                dateRange = cols.slice(0, 3).join(' ');
                                                weekData = cols.slice(3);
                                            }

                                            return (
                                                <tr key={rowIndex}>
                                                    <td className="p-1 border border-gray-400 font-bold text-black text-xs min-w-[90px]">
                                                        <span>{dateRange.split(' To ')[0]}</span><br/>
                                                        <span>To</span><br/>
                                                        <span>{dateRange.split(' To ')[1]}</span>
                                                    </td>
                                                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                                                        const dataIndex = dayIndex * 3;
                                                        if (dataIndex >= weekData.length || !weekData[dataIndex + 1]) {
                                                            return <td key={dayIndex} className="p-1 border border-gray-400"></td>;
                                                        }
                                                        
                                                        const openPana = weekData[dataIndex];
                                                        const jodi = weekData[dataIndex + 1];
                                                        const closePana = weekData[dataIndex + 2];
                                                        
                                                        return (
                                                            <td key={dayIndex} className="p-1 border border-gray-400">
                                                                <DayCell jodi={jodi} openPana={openPana} closePana={closePana} />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground mt-8 py-10">
                                No Panel chart data found for this game.
                             </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
