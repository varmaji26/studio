
'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function GoldenAnkPage() {
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
                            <p 
                                className="text-5xl font-bold text-white tracking-widest"
                                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
                            >
                                4-9-2-7
                            </p>
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
