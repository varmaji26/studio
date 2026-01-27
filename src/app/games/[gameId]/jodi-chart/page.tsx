'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { cn } from '@/lib/utils';

interface JodiChartData extends DocumentData {
  id: string;
  gameName: string;
  title: string;
  data: string;
  activeDays?: string[];
}

const isRedNumber = (num: string) => {
    if (num === '*' || num === '**' || num.length !== 2) return false;
    const digits = num.split('');
    if (digits.some(d => isNaN(parseInt(d, 10)))) return false;
    const [first, second] = [parseInt(digits[0], 10), parseInt(digits[1], 10)];
    const diff = Math.abs(first - second);
    return diff === 5 || first === second;
};

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayAbbreviations: { [key: string]: string } = {
    Monday: 'Mo',
    Tuesday: 'Tu',
    Wednesday: 'We',
    Thursday: 'Th',
    Friday: 'Fr',
    Saturday: 'Sa',
    Sunday: 'Su',
};

export default function JodiChartPage() {
    const params = useParams();
    const gameId = params.gameId;
    const [chartData, setChartData] = useState<JodiChartData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof gameId !== 'string') return;

        const fetchChartAndGameData = async () => {
            setLoading(true);
            try {
                const chartDocRef = doc(db, 'jodiCharts', gameId);
                const chartDoc = await getDoc(chartDocRef);

                if (chartDoc.exists()) {
                    setChartData({ id: chartDoc.id, ...chartDoc.data() } as JodiChartData);
                } else {
                    const gameDocRef = doc(db, 'games', gameId);
                    const gameDoc = await getDoc(gameDocRef);
                    if (gameDoc.exists()) {
                        const gameData = gameDoc.data();
                        setChartData({
                            id: gameId,
                            gameName: gameData.name || 'Game',
                            title: `Jodi Chart for ${gameData.name}`,
                            data: '',
                            activeDays: gameData.activeDays || allDays
                        });
                    } else {
                        setChartData(null);
                    }
                }

            } catch (error) {
                console.error("Error fetching Jodi chart data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChartAndGameData();
    }, [gameId]);

    const activeDays = useMemo(() => {
        return chartData?.activeDays && chartData.activeDays.length > 0 ? chartData.activeDays : allDays;
    }, [chartData]);
    
    const parsedWeeklyData = useMemo(() => {
        if (!chartData?.data) return [];
        
        const dataPerWeek = activeDays.length;
        if(dataPerWeek === 0) return [];
        
        const allJodis = chartData.data.trim().split(/\s+/).filter(Boolean);
        const weeks: string[][] = [];
        for (let i = 0; i < allJodis.length; i += dataPerWeek) {
            const week = allJodis.slice(i, i + dataPerWeek);
            while (week.length < dataPerWeek) {
                week.push('*');
            }
            weeks.push(week);
        }
        return weeks;
    }, [chartData, activeDays]);


    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
            <header className="text-center bg-background/80 backdrop-blur-sm z-30 shrink-0">
                <div className="p-4 bg-background/80">
                    <h1 className="text-xl sm:text-2xl font-bold text-primary">
                        {chartData?.title || `Jodi Chart`}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {chartData?.gameName.toUpperCase() || 'RECORD'}
                    </p>
                </div>
                <div className="bg-primary p-0" style={{ height: '2px' }}></div>
            </header>
            
            {chartData && parsedWeeklyData.length > 0 ? (
                <div className="flex-1 overflow-auto overscroll-y-contain">
                    <table className="w-full border-collapse bg-white">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-gray-200 text-black font-bold text-center text-[10px]">
                                {activeDays.map(day => (
                                    <th key={day} className="p-2 border border-border">{dayAbbreviations[day] || day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedWeeklyData.map((week, weekIndex) => (
                                <tr key={weekIndex}>
                                    {week.map((num, dayIndex) => (
                                        <td key={dayIndex} className={cn(
                                            "p-2 border border-border font-bold text-center",
                                            isRedNumber(num) ? 'text-red-500' : 'text-black'
                                        )}>
                                            {num}
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
                        No Jodi chart data found for this game.
                     </p>
                 </div>
            )}
        </div>
    );
}
