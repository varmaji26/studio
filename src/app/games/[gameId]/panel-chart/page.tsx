'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PanelChartData extends DocumentData {
  id: string;
  gameName: string;
  title: string;
  data: string;
  activeDays?: string[];
}

const isRedNumber = (num: string) => {
    if (!num || num === '**' || num.length !== 2) return false;
    const digits = num.split('');
    if (digits.some(d => isNaN(parseInt(d)))) return false;
    const [first, second] = [parseInt(digits[0]), parseInt(digits[1])];
    const diff = Math.abs(first - second);
    return diff === 5 || first === second;
};

const DayCell = ({ dayData }: { dayData: { openPana: string; jodi: string; closePana: string; } }) => {
    const { openPana, jodi, closePana } = dayData;
    
    const isRed = isRedNumber(jodi);
    
    if (jodi === '**' || jodi === '*' || openPana === '***' ) {
      return (
        <div className={cn("relative p-0 min-h-[30px] flex items-center justify-center font-bold text-base", isRed ? 'text-red-600' : 'text-black')}>
            **
        </div>
      );
    }
    
    return (
        <div className={cn(
            "flex items-center justify-center p-0 min-h-[30px] gap-0.5",
            isRed ? 'text-red-600' : 'text-black'
        )}>
            <div className="text-center text-xs font-semibold leading-tight flex flex-col">
                {openPana.split('').map((digit, i) => <span key={i}>{digit === '*' ? ' ' : digit}</span>)}
            </div>
            <span className="text-base mx-0.5 font-bold">{jodi}</span>
            <div className="text-center text-xs font-semibold leading-tight flex flex-col">
                {closePana.split('').map((digit, i) => <span key={i}>{digit === '*' ? ' ' : digit}</span>)}
            </div>
        </div>
    );
};

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayAbbreviations: { [key: string]: string } = {
    Monday: 'Mo',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
};

export default function PanelChartPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.gameId;
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

    const activeDays = chartData?.activeDays && chartData.activeDays.length > 0 ? chartData.activeDays : allDays;
    const dayIndices = activeDays.map(day => allDays.indexOf(day));

    const parsedRows = React.useMemo(() => {
        if (!chartData?.data) return [];
        
        const dataString = chartData.data.replace(/\r/g, '');
        const dateRangeRegex = /(\d{2}\/\d{2}\/\d{4})\s*to\s*(\d{2}\/\d{2}\/\d{4})/g;
        
        const sections = dataString.split(dateRangeRegex).filter(s => s && s.trim() !== '');

        const rows = [];
        for (let i = 0; i < sections.length; i += 3) {
            const startDate = sections[i];
            const endDate = sections[i + 1];

            if (typeof startDate === 'undefined' || typeof endDate === 'undefined') {
                continue;
            }
            
            const dataBlock = sections[i + 2] || '';
            const dateRange = { start: startDate.trim(), end: endDate.trim() };
            
            const weeklyData = dataBlock.trim().split(/\s+/).join('');

            const daysData: { openPana: string; jodi: string; closePana: string; }[] = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                 let currentIndex = dayIndex * 8;
                 if (weeklyData.length >= currentIndex + 8) {
                     const openPana = weeklyData.slice(currentIndex, currentIndex + 3);
                     const jodi = weeklyData.slice(currentIndex + 3, currentIndex + 5);
                     const closePana = weeklyData.slice(currentIndex + 5, currentIndex + 8);
                     daysData.push({ openPana, jodi, closePana });
                } else {
                    daysData.push({ openPana: '***', jodi: '**', closePana: '***' });
                }
            }
            const filteredDaysData = dayIndices.map(index => daysData[index]);
            rows.push({ dateRange, daysData: filteredDaysData });
        }
        return rows;
    }, [chartData, dayIndices]);


    if (!isClient || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground">
             <div className="bg-card/80 p-4 text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-primary">
                    {chartData?.title || 'Panel Chart'}
                </h1>
                <p className="text-muted-foreground">
                    {chartData?.gameName.toUpperCase() || 'RECORD'}
                </p>
            </div>
             <div className="p-4">
                <Button className="w-full bg-green-500 text-white hover:bg-green-600" onClick={() => router.push(`/#${gameId}`)}>
                    <div className="inline-flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Home</span>
                    </div>
                </Button>
            </div>

            {chartData && parsedRows.length > 0 ? (
                <div className="overflow-x-auto border-y-2 border-yellow-600 bg-orange-100">
                    <table className="w-full border-collapse">
                        <thead className="text-[9px] sm:text-[10px]">
                            <tr className="bg-blue-800 text-white font-bold">
                                <th className="p-0.5 border border-yellow-600">Date</th>
                                {activeDays.map(day => (
                                    <th key={day} className="p-0.5 border border-yellow-600">{dayAbbreviations[day]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-center">
                           {parsedRows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="p-0.5 border border-gray-400 font-bold text-black text-[7px] text-center">
                                        <span>{row.dateRange.start}</span><br/>
                                        <span>To</span><br/>
                                        <span>{row.dateRange.end}</span>
                                    </td>
                                    {row.daysData.map((dayData, dayIndex) => (
                                        <td key={dayIndex} className="p-0 border border-gray-400">
                                            <DayCell dayData={dayData} />
                                        </td>
                                    ))}
                                </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-4">
                    <p className="text-center text-muted-foreground mt-8 py-10">
                        No Panel chart data found for this game.
                    </p>
                </div>
            )}
        </div>
    );
}
