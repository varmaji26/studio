
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface JodiChartData extends DocumentData {
  id: string;
  gameName: string;
  title: string;
  data: string;
}

interface GameData extends DocumentData {
    id: string;
    activeDays?: string[];
}

const isRedNumber = (num: string) => {
    if (num === '*' || num.length !== 2) return false;
    const [first, second] = num.split('');
    const diff = Math.abs(parseInt(first) - parseInt(second));
    return diff === 5 || first === second;
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

export default function JodiChartPage() {
    const { gameId } = useParams();
    const router = useRouter();
    const [chartData, setChartData] = useState<JodiChartData | null>(null);
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof gameId !== 'string') return;

        const fetchChartAndGameData = async () => {
            setLoading(true);
            try {
                const chartDocRef = doc(db, 'jodiCharts', gameId);
                const gameDocRef = doc(db, 'games', gameId);

                const [chartDoc, gameDoc] = await Promise.all([
                    getDoc(chartDocRef),
                    getDoc(gameDocRef)
                ]);

                if (chartDoc.exists()) {
                    setChartData({ id: chartDoc.id, ...chartDoc.data() } as JodiChartData);
                } else {
                    setChartData(null);
                }
                
                if (gameDoc.exists()) {
                    setGameData({ id: gameDoc.id, ...gameDoc.data() } as GameData);
                } else {
                    // Fallback to all days if game data not found for some reason
                    setGameData({ id: gameId as string, activeDays: allDays });
                }

            } catch (error) {
                console.error("Error fetching Jodi chart data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChartAndGameData();
    }, [gameId]);

    const activeDays = gameData?.activeDays && gameData.activeDays.length > 0 ? gameData.activeDays : allDays;
    const numberOfDays = activeDays.length;

    const parsedData = chartData?.data.split(/\s+/).filter(d => d) || [];
    
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
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/" className="inline-flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                        {chartData ? (
                            <div className="overflow-x-auto border-2 border-primary bg-orange-100 p-1">
                                <div 
                                    className="grid text-center font-bold text-white bg-blue-800"
                                    style={{ gridTemplateColumns: `repeat(${numberOfDays}, minmax(0, 1fr))` }}
                                >
                                    {activeDays.map(day => (
                                        <div key={day} className="p-2 border-b-2 border-primary">{dayAbbreviations[day]}</div>
                                    ))}
                                </div>
                                <div 
                                    className="grid text-center"
                                    style={{ gridTemplateColumns: `repeat(${numberOfDays}, minmax(0, 1fr))` }}
                                >
                                    {parsedData.map((num, index) => (
                                        <div key={index} 
                                             className={`p-2 border border-gray-300 font-bold ${isRedNumber(num) ? 'text-red-600' : 'text-black'}`}>
                                            {num}
                                        </div>
                                    ))}
                                </div>
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
