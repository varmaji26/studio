'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, IndianRupee, Landmark, History, Banknote } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const FundsPage = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-background text-foreground pb-28">
            <header className="p-4 flex items-center gap-4 sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Funds</h1>
            </header>
            <main className="p-4">
                <div className="space-y-4">
                    <Link href="/add-fund" className="block mb-4">
                        <div className="bg-background/80 border border-white/10 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-background/90 transition-colors shadow-lg shadow-white/10 transition-transform active:scale-95">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-primary/20 rounded-full">
                                   <IndianRupee className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">Add Fund</h2>
                                    <p className="text-sm text-muted-foreground">You can add fund to your wallet</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                    
                     <Link href="/withdrawal" className="block mb-4">
                        <div className="bg-background/80 border border-white/10 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-background/90 transition-colors shadow-lg shadow-white/10 transition-transform active:scale-95">
                           <div className="flex items-center gap-4">
                               <div className="p-2 bg-primary/20 rounded-full">
                                   <Banknote className="h-6 w-6 text-primary" />
                               </div>
                               <div>
                                   <h2 className="font-semibold text-lg">Withdraw Fund</h2>
                                   <p className="text-sm text-muted-foreground">You can withdraw winnings</p>
                               </div>
                           </div>
                           <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>

                    <Link href="/payment-history" className="block mb-4">
                       <div className="bg-background/80 border border-white/10 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-background/90 transition-colors shadow-lg shadow-white/10 transition-transform active:scale-95">
                           <div className="flex items-center gap-4">
                               <div className="p-2 bg-primary/20 rounded-full">
                                   <History className="h-6 w-6 text-primary" />
                               </div>
                               <div>
                                   <h2 className="font-semibold text-lg">Add Fund History</h2>
                                   <p className="text-sm text-muted-foreground">You can check your add point history</p>
                               </div>
                           </div>
                           <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>

                    <Link href="/payment-history" className="block mb-4">
                       <div className="bg-background/80 border border-white/10 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-background/90 transition-colors shadow-lg shadow-white/10 transition-transform active:scale-95">
                           <div className="flex items-center gap-4">
                               <div className="p-2 bg-primary/20 rounded-full">
                                   <History className="h-6 w-6 text-primary" />
                               </div>
                               <div>
                                   <h2 className="font-semibold text-lg">Withdraw Fund History</h2>
                                   <p className="text-sm text-muted-foreground">You can check your Withdraw point history</p>
                               </div>
                           </div>
                           <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default FundsPage;
