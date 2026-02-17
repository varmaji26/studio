
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const RateItem = ({ name, rate }: { name: string; rate: string }) => (
    <div className="bg-indigo-600 text-white flex justify-between items-center p-3 rounded-lg shadow-md">
        <span className="font-semibold text-xs">{name}</span>
        <span className="font-bold text-xs">{rate}</span>
    </div>
);


export default function RateCardPage() {
    const { user } = useAuth();
    const [gameRates, setGameRates] = useState<any>(null);
    const [ratesLoading, setRatesLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setRatesLoading(false);
            return;
        }

        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.gameRates) {
                    setGameRates(data.gameRates);
                } else {
                    // Set default rates if not found in db
                    setGameRates({
                        singleDigitPrize: 100,
                        jodiDigitPrize: 1000,
                        singlePanaPrize: 1500,
                        doublePanaPrize: 3000,
                        triplePanaPrize: 6000,
                        halfSangamPrize: 5000,
                        fullSangamPrize: 10000,
                    });
                }
            }
            setRatesLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const standardGameRates = gameRates ? [
        { name: 'SINGLE DIGIT', rate: `₹10 Ka - ₹${gameRates.singleDigitPrize}` },
        { name: 'JODI DIGIT', rate: `₹10 Ka - ₹${gameRates.jodiDigitPrize}` },
        { name: 'SINGLE PANNA', rate: `₹10 Ka - ₹${gameRates.singlePanaPrize}` },
        { name: 'DOUBLE PANNA', rate: `₹10 Ka - ₹${gameRates.doublePanaPrize}` },
        { name: 'TRIPLE PANNA', rate: `₹10 Ka - ₹${gameRates.triplePanaPrize}` },
        { name: 'HALF SANGAM', rate: `₹10 Ka - ₹${gameRates.halfSangamPrize}` },
        { name: 'FULL SANGAM', rate: `₹10 Ka - ₹${gameRates.fullSangamPrize}` },
    ] : [];


    if (!user) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                <Card className="bg-card/80 border-white/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">Game Rates</CardTitle>
                        <CardDescription>Here you can see the betting rates for all games.</CardDescription>
                         <div className="pt-4">
                            <Button asChild variant="ghost" className="pl-0">
                                <Link href="/" replace className="inline-flex items-center gap-2 text-sm text-green-500 hover:underline">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-4 text-primary">STANDARD GAMES</h2>
                             {ratesLoading ? (
                                <div className="space-y-3">
                                    {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {standardGameRates.map((item) => (
                                        <RateItem key={item.name} name={item.name} rate={item.rate} />
                                    ))}
                                </div>
                            )}
                        </div>
                         <div>
                            <h2 className="text-xl font-bold mb-4 text-primary">STARLINES GAMES</h2>
                            <p className="text-muted-foreground">Starline game rates will be updated soon.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
