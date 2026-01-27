
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
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
        <div className={cn("relative p-0 min-h-[30px] flex items-center justify-center font-bold text-base", isRed ? 'text-red-500' : 'text-black')}>
            **
        </div>
      );
    }
    
    return (
        <div className={cn(
            "flex items-center justify-center p-0 min-h-[30px] gap-0.5",
            isRed ? 'text-red-500' : 'text-black'
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
                    const gameDocRef = doc(db, 'games', gameId);
                    const gameDoc = await getDoc(gameDocRef);
                    if (gameDoc.exists()) {
                        const gameData = gameDoc.data();
                        setChartData({
                            id: gameId,
                            gameName: gameData.name || 'Game',
                            title: `PANEL CHART FOR ${gameData.name.toUpperCase()}`,
                            data: '',
                            activeDays: gameData.activeDays || allDays
                        });
                    } else {
                        setChartData(null);
                    }
                }
            } catch (error) {
                console.error("Error fetching Panel chart data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [gameId]);

    const activeDays = useMemo(() => {
        return chartData?.activeDays && chartData.activeDays.length > 0 ? chartData.activeDays : allDays;
    }, [chartData]);
    
    const dayIndices = React.useMemo(() => activeDays.map(day => allDays.indexOf(day)), [activeDays]);

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
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
             <header className="text-center bg-background/80 backdrop-blur-sm z-30 shrink-0">
                <div className="p-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-primary">
                        {chartData?.title || 'Panel Chart'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {chartData?.gameName.toUpperCase() || 'RECORD'}
                    </p>
                </div>
            </header>

            {chartData && parsedRows.length > 0 ? (
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse bg-white">
                        <thead className="sticky top-0 z-20">
                             <tr className="bg-primary">
                                <td colSpan={activeDays.length + 1} className="p-0" style={{ height: '2px' }}></td>
                            </tr>
                            <tr className="text-black font-bold text-[9px] sm:text-[10px]">
                                <th className="sticky left-0 p-0.5 border border-border bg-gray-300 z-30">Date</th>
                                {activeDays.map(day => (
                                    <th key={day} className="p-0.5 border border-border bg-gray-200">{dayAbbreviations[day]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-center">
                           {parsedRows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    <td className="sticky left-0 p-0.5 border border-border font-bold text-black bg-gray-200 text-[7px] text-center z-10">
                                        <span>{row.dateRange.start}</span><br/>
                                        <span>To</span><br/>
                                        <span>{row.dateRange.end}</span>
                                    </td>
                                    {row.daysData.map((dayData, dayIndex) => (
                                        <td key={dayIndex} className="p-0 border border-border">
                                            <DayCell dayData={dayData} />
                                        </td>
                                    ))}
                                </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                    <p className="text-center text-muted-foreground">
                        No Panel chart data found for this game.
                    </p>
                </div>
            )}
        </div>
    );
}
