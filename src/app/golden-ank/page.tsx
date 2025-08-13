
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Skeleton } from '@/components/ui/skeleton';

interface AppSettings extends DocumentData {
    goldenAnk?: string;
}

export default function GoldenAnkPage() {
    const [goldenAnk, setGoldenAnk] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppSettings;
                setGoldenAnk(data.goldenAnk || null);
            } else {
                setGoldenAnk(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching Golden Ank:", error);
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    return (
        <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6 flex items-center justify-center">
            <div className="max-w-md w-full">
                <Card className="bg-card/80 border-white/10 shadow-lg text-center">
                    <CardHeader>
                        <CardTitle 
                            className="text-4xl font-bold text-amber-400"
                            style={{ textShadow: '2px 2px 4px #000' }}
                        >
                            Golden Ank
                        </CardTitle>
                        <CardDescription>Today's lucky numbers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="bg-slate-900/50 border-2 border-amber-400 rounded-lg p-6">
                            {loading ? (
                                <Skeleton className="h-12 w-48 mx-auto" />
                            ) : (
                                <p 
                                    className="text-5xl font-bold text-white tracking-widest"
                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
                                >
                                    {goldenAnk || '----'}
                                </p>
                            )}
                        </div>
                        <Button asChild className="w-full bg-green-500 text-white hover:bg-green-600">
                            <Link href="/" className="inline-flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back to Home</span>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
