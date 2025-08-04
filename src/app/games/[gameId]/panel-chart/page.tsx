
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
    if (num === '*' || num.length !== 2) return false;
    const [first, second] = num.split('');
    const diff = Math.abs(parseInt(first) - parseInt(second));
    return diff === 5 || first === second;
};

const DayCell = ({ jodi, pana, isRed }: { jodi: string, pana: string, isRed: boolean }) => (
    <div className="flex flex-col items-center justify-center p-1 border border-gray-400">
        <span className="text-xs">{pana.substring(0,3)}</span>
        <span className={`font-bold text-lg ${isRed ? 'text-red-600' : 'text-black'}`}>{jodi}</span>
        <span className="text-xs">{pana.substring(3)}</span>
    </div>
);

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
                            <div className="overflow-x-auto border-2 border-primary bg-orange-100 p-1">
                                <div className="grid grid-cols-8 text-center font-bold text-white bg-blue-800">
                                    <div className="p-2 border-b-2 border-primary">Date</div>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <div key={day} className="p-2 border-b-2 border-primary">{day}</div>
                                    ))}
                                </div>
                                <div className="text-center">
                                    {parsedRows.map((row, rowIndex) => {
                                        const cols = row.split(/\s+/).filter(d => d);
                                        const dateRange = cols.slice(0, 3).join(' ');
                                        const weekData = cols.slice(3);
                                        return (
                                            <div key={rowIndex} className="grid grid-cols-8">
                                                <div className="flex flex-col items-center justify-center p-1 border border-gray-400 font-bold text-black text-xs">
                                                    <span>{dateRange.split(' To ')[0]}</span>
                                                    <span>To</span>
                                                    <span>{dateRange.split(' To ')[1]}</span>
                                                </div>
                                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                                    const dataIndex = dayIndex * 3;
                                                    if (dataIndex >= weekData.length) return <div key={dayIndex} className="border border-gray-400"></div>;
                                                    
                                                    const openPana = weekData[dataIndex];
                                                    const jodi = weekData[dataIndex + 1];
                                                    const closePana = weekData[dataIndex + 2];
                                                    const isRed = isRedNumber(jodi);
                                                    
                                                    return <DayCell key={dayIndex} jodi={jodi} pana={`${openPana}${closePana}`} isRed={isRed} />;
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
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
