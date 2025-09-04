
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Landmark, Phone, Wallet } from 'lucide-react';
import Link from 'next/link';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface UserProfile extends DocumentData {
  balance?: number;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

export default function AddFundPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile>({});
    const [settings, setSettings] = useState<AppSettings>({});
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setProfile(doc.data() as UserProfile);
            }
        });
        
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            }
        });

        return () => {
            unsubscribeUser();
            unsubscribeSettings();
        };
    }, [user]);

    const handleQuickAmount = (value: string) => {
        setAmount(value);
    };
    
    const handlePayNow = () => {
        const parsedAmount = parseInt(amount, 10);
        if (isNaN(parsedAmount) || parsedAmount < 100) {
            toast({
                variant: 'destructive',
                title: 'Invalid Amount',
                description: 'Minimum amount to add is ₹100.',
            });
            return;
        }
        router.push(`/payment-qr?amount=${amount}`);
    };
    
    const handleCall = () => {
        if (settings.callSupportNumber) {
            const phoneNumber = settings.callSupportNumber.replace(/\s/g, '');
            const a = document.createElement('a');
            a.href = `tel:${phoneNumber}`;
            a.click();
        }
    };

    const handleWhatsapp = () => {
        if (settings.whatsappNumber) {
            const whatsappNumber = settings.whatsappNumber.replace(/\+/g, '');
            const a = document.createElement('a');
            a.href = `https://wa.me/${whatsappNumber}`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.click();
        }
    };


    if (authLoading || !user) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-gray-200">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    const mobileNumber = user.email?.split('@')[0];
    const totalBalance = (profile.balance || 0);

    return (
        <div className="dark min-h-screen bg-gray-200 text-black flex flex-col">
            <header className="p-4 flex items-center gap-4 bg-white sticky top-0 z-10 shadow-sm">
                <Link href="/funds">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Add Fund</h1>
                <div className="ml-auto flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full">
                    <Wallet className="h-5 w-5" />
                    <span>₹{totalBalance.toFixed(1) || '0.0'}</span>
                </div>
            </header>
            
            <main className="flex-1 p-4">
                <div className="bg-[#112a45] text-white rounded-lg p-4 mb-4 text-center">
                    <h2 className="text-lg font-bold">{user.displayName}</h2>
                    <p className="text-sm">{mobileNumber}</p>
                    <div className="bg-black/50 mt-2 p-2 rounded-md">
                        <p className="text-sm">Available Balance</p>
                        <p className="text-xl font-bold">₹ {totalBalance.toFixed(1) || '0.0'}</p>
                    </div>
                </div>

                <div className="text-center mb-4 p-4 rounded-lg bg-green-100 border border-green-200">
                    <p className="text-sm text-green-800 font-semibold">For Fund Query's please Call Or Whatsapp</p>
                    <div className="flex justify-center gap-4 mt-2">
                        <Button className="rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={handleCall}>
                            <Phone className="mr-2 h-4 w-4" /> Call
                        </Button>
                        <Button className="rounded-full bg-[#25D366] hover:bg-[#1EBE55] text-white" onClick={handleWhatsapp}>
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z"/></svg>
                           Whatsapp
                        </Button>
                    </div>
                </div>

                <div className="my-4">
                    <p className="text-center text-gray-600 mb-2">Enter Amount</p>
                    <div className="relative">
                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400"/>
                        <Input 
                            type="number"
                            placeholder="Enter Amount" 
                            className="bg-white rounded-full h-14 pl-12 text-lg text-center"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('100')}>100</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('500')}>500</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('1000')}>1000</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('1500')}>1500</Button>
                    </div>
                </div>
            </main>

            <footer className="p-4 bg-white sticky bottom-0">
                <Button className="w-full h-14 bg-[#112a45] hover:bg-[#0b1c2e] text-white font-bold text-lg rounded-full" onClick={handlePayNow}>
                    Pay Now
                </Button>
            </footer>
        </div>
    );
}
