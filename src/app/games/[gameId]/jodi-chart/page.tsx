
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
        const rows = chartData.data.trim().split('\n');
        return rows.map(row => row.trim().split(/\s+/).filter(Boolean));
    }, [chartData]);


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
                            {chartData?.title || `Jodi Chart`}
                        </CardTitle>
                        <CardDescription>
                            Historical Jodi Records
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Button asChild className="w-full bg-green-500 text-white hover:bg-green-600">
                                <Link href={`/`} className="inline-flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                        {chartData && parsedWeeklyData.length > 0 ? (
                            <div className="overflow-x-auto border-2 border-primary bg-orange-100 p-1">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-blue-800 text-white font-bold text-center">
                                            {activeDays.map(day => (
                                                <th key={day} className="p-2 border border-gray-300">{dayAbbreviations[day] || day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedWeeklyData.map((week, weekIndex) => (
                                            <tr key={weekIndex}>
                                                {week.map((num, dayIndex) => (
                                                    <td key={dayIndex} className={cn(
                                                        "p-2 border border-gray-300 font-bold text-center",
                                                        isRedNumber(num) ? 'text-red-600' : 'text-black'
                                                    )}>
                                                        {num}
                                                    </td>
                                                ))}
                                                {/* Pad row with empty cells if needed */}
                                                {Array.from({ length: Math.max(0, activeDays.length - week.length) }).map((_, i) => (
                                                    <td key={`pad-${i}`} className="p-2 border border-gray-300 font-bold text-black"></td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground mt-8 py-10">
                                No Jodi chart data found for this game.
                             </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
