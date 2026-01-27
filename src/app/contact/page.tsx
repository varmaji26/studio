
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Phone, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
    telegramLink?: string;
}

export default function ContactPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState<AppSettings>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }

        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            }
            setLoading(false);
        });
        
        return () => unsubscribe();
    }, [user, authLoading, router]);
    
    const handleAction = (url: string | undefined, type: 'tel' | 'whatsapp' | 'telegram') => {
        if (!url) return;
        
        let finalUrl = '';
        switch(type) {
            case 'tel':
                finalUrl = `tel:${url.replace(/\s/g, '')}`;
                break;
            case 'whatsapp':
                finalUrl = `https://wa.me/${url.replace(/\+/g, '')}`;
                break;
            case 'telegram':
                finalUrl = url;
                break;
        }

        const a = document.createElement('a');
        a.href = finalUrl;
        if (type !== 'tel') {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        a.click();
    };

    if (authLoading || loading) {
        return (
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    return (
        <div className="dark min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-background text-foreground pb-28">
             <header className="p-4 flex items-center justify-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold">Support</h1>
            </header>
            <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-2">
                <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold">Contact Us</h2>
                    <p className="text-muted-foreground mt-2">We're here to help. Reach out to us through any of the channels below.</p>
                </div>
                <div className="space-y-4">
                    {settings.callSupportNumber && (
                        <Button
                            className="w-full h-16 bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-3 text-lg"
                            onClick={() => handleAction(settings.callSupportNumber, 'tel')}
                        >
                            <Phone /> Call Us: {settings.callSupportNumber}
                        </Button>
                    )}
                     {settings.whatsappNumber && (
                        <Button
                            className="w-full h-16 bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-3 text-lg"
                            onClick={() => handleAction(settings.whatsappNumber, 'whatsapp')}
                        >
                            <svg height="32" width="32" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" fill="currentColor"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style={{fill: '#EDEDED'}} d="M0,512l35.31-128C12.359,344.276,0,300.138,0,254.234C0,114.759,114.759,0,255.117,0 S512,114.759,512,254.234S395.476,512,255.117,512c-44.138,0-86.51-14.124-124.469-35.31L0,512z"></path> <path style={{fill: '#55CD6C'}} d="M137.71,430.786l7.945,4.414c32.662,20.303,70.621,32.662,110.345,32.662 c115.641,0,211.862-96.221,211.862-213.628S371.641,44.138,255.117,44.138S44.138,137.71,44.138,254.234 c0,40.607,11.476,80.331,32.662,113.876l5.297,7.945l-20.303,74.152L137.71,430.786z"></path> <path style={{fill: '#FEFEFE'}} d="M187.145,135.945l-16.772-0.883c-5.297,0-10.593,1.766-14.124,5.297 c-7.945,7.062-21.186,20.303-24.717,37.959c-6.179,26.483,3.531,58.262,26.483,90.041s67.09,82.979,144.772,105.048 c24.717,7.062,44.138,2.648,60.028-7.062c12.359-7.945,20.303-20.303,22.952-33.545l2.648-12.359 c0.883-3.531-0.883-7.945-4.414-9.71l-55.614-25.6c-3.531-1.766-7.945-0.883-10.593,2.648l-22.069,28.248 c-1.766,1.766-4.414,2.648-7.062,1.766c-15.007-5.297-65.324-26.483-92.69-79.448c-0.883-2.648-0.883-5.297,0.883-7.062 l21.186-23.834c1.766-2.648,2.648-6.179,1.766-8.828l-25.6-57.379C193.324,138.593,190.676,135.945,187.145,135.945"></path> </g></svg>
                            WhatsApp
                        </Button>
                    )}
                    {settings.telegramLink && (
                         <Button
                            className="w-full h-16 bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-3 text-lg"
                            onClick={() => handleAction(settings.telegramLink, 'telegram')}
                        >
                            <Send /> Telegram
                        </Button>
                    )}
                    
                    {!settings.callSupportNumber && !settings.whatsappNumber && !settings.telegramLink && (
                        <p className="text-center text-muted-foreground">Contact details are not available at the moment.</p>
                    )}

                </div>
            </div>
        </div>
    )
}
