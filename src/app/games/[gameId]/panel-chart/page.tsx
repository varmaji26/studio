
'use client';

import * as React from 'react';
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
    if (jodi === '*' || openPana === '*' || closePana === '*') {
      return <div className="p-1 min-h-[60px] flex items-center justify-center text-black font-bold text-2xl">*</div>;
    }

    const isRed = isRedNumber(jodi);

    return (
        <div className="relative p-1 min-h-[60px] flex items-center justify-center font-bold">
            <div className="flex flex-col text-xs text-black">
                <span>{openPana[0]}</span>
                <span>{openPana[1]}</span>
                <span>{openPana[2]}</span>
            </div>
            <span className={`text-2xl mx-1 ${isRed ? 'text-red-600' : 'text-black'}`}>{jodi}</span>
            <div className="flex flex-col text-xs text-black">
                <span>{closePana[0]}</span>
                <span>{closePana[1]}</span>
                <span>{closePana[2]}</span>
            </div>
        </div>
    );
};


export default function PanelChartPage() {
    const { gameId } = useParams();
    const [chartData, setChartData] = useState<PanelChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
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

    const parsedRows = React.useMemo(() => {
        if (!chartData?.data) return [];
        
        return chartData.data.split('\n\n').filter(block => block.trim() !== '').map(block => {
            const lines = block.trim().split('\n');
            const dateLine = lines[0] + ' ' + lines[1] + ' ' + lines[2];
            const dateRangeMatch = dateLine.match(/(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/);
            
            let dateRange = { start: '', end: '' };
            if (dateRangeMatch) {
                dateRange = { start: dateRangeMatch[1], end: dateRangeMatch[2] };
            }

            const dataLines = lines.slice(3).join(' ').trim();
            const weeklyData = dataLines.split(/\s+/).filter(d => d);
            
            const daysData = [];
            for (let i = 0; i < 7; i++) {
                const dayDataIndex = i * 5; // Each day seems to have 5 numbers
                if (dayDataIndex < weeklyData.length) {
                    daysData.push({
                        openPana: weeklyData.slice(dayDataIndex, dayDataIndex+3).join(''),
                        jodi: weeklyData[dayDataIndex+3] || '*',
                        closePana: weeklyData[dayDataIndex+4] ? weeklyData.slice(dayDataIndex+4, dayDataIndex+7).join('') : '*'
                    });
                } else {
                     daysData.push({ openPana: '*', jodi: '*', closePana: '*' });
                }
            }
             const finalWeeklyData = lines.join(' ').trim().split(/\s+/);
             const dateMatch = finalWeeklyData.findIndex(d => d === 'to');
             let cleanData = finalWeeklyData;
             if(dateMatch !== -1) {
                dateRange = { start: finalWeeklyData[dateMatch-1], end: finalWeeklyData[dateMatch+1] };
                cleanData = finalWeeklyData.slice(dateMatch+2);
             }


            const newDaysData = [];
            for (let i = 0; i < 7; i++) {
                 const openPana = cleanData.slice(i * 5, i * 5 + 3).join('');
                 const jodi = cleanData[i * 5 + 3];
                 const closePana = cleanData[i * 5 + 4] ? cleanData.slice(i * 5 + 4, i * 5 + 7).join('') : undefined;
                 
                 newDaysData.push({
                    openPana: openPana.length === 3 ? openPana : '*',
                    jodi: jodi && jodi.length === 2 ? jodi : '*',
                    closePana: closePana && closePana.length === 3 ? closePana : '*'
                 })
            }
            
            return { dateRange, daysData: newDaysData };
        });

    }, [chartData]);


    if (!isClient || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-2 sm:p-4">
            <div className="max-w-5xl mx-auto">
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
                            <div className="overflow-x-auto border-2 border-yellow-600 bg-orange-100 p-1">
                                <table className="w-full border-collapse">
                                    <thead className="text-sm">
                                        <tr className="bg-blue-800 text-white font-bold">
                                            <th className="p-2 border border-yellow-600">Date</th>
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <th key={day} className="p-2 border border-yellow-600">{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="text-center">
                                       {parsedRows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td className="p-1 border border-gray-400 font-bold text-black text-xs min-w-[90px]">
                                                    <span>{row.dateRange.start}</span><br/>
                                                    <span>To</span><br/>
                                                    <span>{row.dateRange.end}</span>
                                                </td>
                                                {row.daysData.map((dayData, dayIndex) => (
                                                    <td key={dayIndex} className="p-1 border border-gray-400">
                                                        <DayCell 
                                                            jodi={dayData.jodi}
                                                            openPana={dayData.openPana}
                                                            closePana={dayData.closePana}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                       ))}
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

