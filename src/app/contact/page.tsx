
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
        switch(type) {
            case 'tel':
                window.location.href = `tel:+${url.replace(/\+/g, '')}`;
                break;
            case 'whatsapp':
                window.open(`https://wa.me/${url.replace(/\+/g, '')}`, '_blank');
                break;
            case 'telegram':
                window.open(url, '_blank');
                break;
        }
    };

    if (authLoading || loading) {
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
                        <CardTitle className="text-2xl sm:text-3xl">Contact Us</CardTitle>
                        <CardDescription>We're here to help. Reach out to us through any of the channels below.</CardDescription>
                         <div className="pt-4">
                            <Button asChild variant="ghost" className="pl-0">
                                <Link href="/" className="inline-flex items-center gap-2 text-sm text-green-500 hover:underline">
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Back to Home</span>
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {settings.callSupportNumber && (
                            <Button
                                className="w-full h-16 bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-3 text-lg"
                                onClick={() => handleAction(settings.callSupportNumber, 'tel')}
                            >
                                <Phone /> Call Us: +{settings.callSupportNumber}
                            </Button>
                        )}
                         {settings.whatsappNumber && (
                            <Button
                                className="w-full h-16 bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-3 text-lg"
                                onClick={() => handleAction(settings.whatsappNumber, 'whatsapp')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z" /></svg>
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

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
