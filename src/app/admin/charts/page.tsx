
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

interface Game extends DocumentData {
    id: string;
    name: string;
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function ChartsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card className="bg-card/80 border-white/10 shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Game Charts</CardTitle>
          <CardDescription>Visual representation of game load and statistics.</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="h-8 w-8 text-primary" />
        </div>
      ) : games.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="bg-card/80 border-white/10 shadow-lg">
              <CardHeader>
                <CardTitle>{game.name}</CardTitle>
                <CardDescription>Placeholder load chart for {game.name}.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={chartData}>
                     <CartesianGrid vertical={false} />
                     <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                      />
                      <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                    <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-4">No games found to display charts.</p>
      )}
    </div>
  );
}
