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
    
    const dayIndices = useMemo(() => {
        return activeDays.map(day => allDays.indexOf(day));
    }, [activeDays]);
    
    const parsedWeeklyData = useMemo(() => {
        if (!chartData?.data) return [];
        
        const allNumbers = chartData.data.trim().split(/\s+/).filter(Boolean);
        const weeklyData: string[][] = [];
        
        // Assume data is stored for 7 days per week, we chunk by 7
        for (let i = 0; i < allNumbers.length; i += 7) {
            const weekSlice = allNumbers.slice(i, i + 7);
            // Pad the week if it's incomplete
            while (weekSlice.length < 7) {
                weekSlice.push('*');
            }
            // Filter the week to only include active days
            const filteredWeek = dayIndices.map(index => weekSlice[index] || '*');
            weeklyData.push(filteredWeek);
        }
        
        return weeklyData;
    }, [chartData, dayIndices]);


    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="p-4 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <div className="text-center flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-primary">
                        {chartData?.title || `Jodi Chart`}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {chartData?.gameName.toUpperCase() || 'RECORD'}
                    </p>
                </div>
            </header>
            
            {chartData && parsedWeeklyData.length > 0 ? (
                <div className="overflow-x-auto border-y-2 border-primary bg-white">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-200 text-black font-bold text-center">
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
                 <div className="p-4">
                    <p className="text-center text-muted-foreground mt-8 py-10">
                        No Jodi chart data found for this game.
                     </p>
                 </div>
            )}
        </div>
    );
}
