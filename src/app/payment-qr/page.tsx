
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, HelpCircle, Loader, RefreshCw, Scan, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface AppSettings extends DocumentData {
    upiId?: string;
    whatsappNumber?: string;
}

function PaymentQRContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get('amount');
    const { user } = useAuth();
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
    const [orderId, setOrderId] = useState<string | null>(null);
    const [dateTime, setDateTime] = useState<string | null>(null);
    const [upiUrl, setUpiUrl] = useState('');


    useEffect(() => {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const upiId = data.paymentDetails?.UPI?.details;
                setSettings({ ...data, upiId: upiId } as AppSettings);
            } else {
                setSettings({});
            }
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (settings && settings.upiId && amount && user) {
            const payeeName = "Matka King";
            const generatedUpiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
            setUpiUrl(generatedUpiUrl);
            QRCode.toDataURL(generatedUpiUrl)
                .then(url => setQrCodeDataUrl(url))
                .catch(err => console.error(err));
        }
    }, [settings, amount, user]);

    useEffect(() => {
        if (timeLeft === 0) return;
        const timerId = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    useEffect(() => {
        // Generate orderId and dateTime on the client side to avoid hydration mismatch
        setOrderId(`#${Date.now()}`);
        setDateTime(new Date().toLocaleString('en-GB'));
    }, []);
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    const handleContactSupport = () => {
        if (settings?.whatsappNumber) {
            window.open(`https://wa.me/${settings.whatsappNumber}?text=I%20need%20help%20with%20my%20payment%20(Order%20ID:%20${orderId})`, '_blank');
        } else {
            alert('Support contact not available.');
        }
    }

    if (!amount) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <p>Amount not specified.</p>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-[#004D40] text-white p-4 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-xl font-bold">Payment QR</h1>
                <div className="w-10"></div>
            </header>
            <main className="flex-1 p-4 bg-white">
                <div className="max-w-md mx-auto">
                    <div className="bg-[#5C6BC0] text-white p-4 rounded-t-lg flex items-center justify-between">
                         <Button variant="ghost" size="icon" className="invisible">
                            <ArrowLeft />
                        </Button>
                        <h2 className="font-bold text-lg">Complete Payment</h2>
                        <Image src="https://placehold.co/40x20.png" alt="IKS Logo" width={40} height={20} data-ai-hint="company logo"/>
                    </div>
                    
                    <div className="bg-white p-6 rounded-b-lg shadow-lg space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                           <Scan className="h-5 w-5"/>
                           <span className="font-semibold">Scan to Pay</span>
                        </div>
                        
                        <p className="text-center text-4xl font-bold text-black">
                            ₹{parseFloat(amount).toFixed(2)}
                        </p>

                        <div className="flex justify-center">
                            {qrCodeDataUrl ? (
                                <Image src={qrCodeDataUrl} alt="Payment QR Code" width={200} height={200} />
                            ) : (
                                <Skeleton className="h-[200px] w-[200px]" />
                            )}
                        </div>
                        
                        <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded-md flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Time remaining: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
                        </div>
                        
                        <div className="space-y-3 text-sm text-gray-600">
                            {[
                                "Open your UPI payment app",
                                "Tap on 'Scan QR Code'",
                                "Point camera at the QR code",
                                "Confirm amount & pay"
                            ].map((step, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white font-bold">{index + 1}</span>
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-green-100 text-green-800 p-3 rounded-md flex items-center justify-center gap-2">
                           <Loader className="h-4 w-4 animate-spin"/>
                           <span>Verifying payment...</span>
                        </div>
                        
                        <div className="border-t pt-4 space-y-2">
                           <div className="flex items-center gap-2 font-semibold text-gray-800">
                               <FileText className="h-5 w-5 text-gray-500"/>
                               <h3>Order Details</h3>
                           </div>
                           <div className="text-sm space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                    <span>Order ID</span>
                                    {orderId ? <span className="font-mono">{orderId}</span> : <Skeleton className="h-4 w-24" />}
                                </div>
                                 <div className="flex justify-between">
                                    <span>Date & Time</span>
                                    {dateTime ? <span>{dateTime}</span> : <Skeleton className="h-4 w-32" />}
                                </div>
                                <div className="flex justify-between">
                                    <span>Payment Method</span>
                                    <span>UPI QR Payment</span>
                                </div>
                           </div>
                        </div>

                        <div className="text-center text-sm text-gray-500 space-y-1 pt-2">
                           <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500"/> 100% Secure Payment</p>
                           <button onClick={handleContactSupport} className="flex items-center justify-center gap-1 text-blue-600"><HelpCircle className="h-4 w-4"/> Need help? Contact Support</button>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="bg-gray-100 p-4 space-y-3 sticky bottom-0">
                 <Button asChild className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold" disabled={!upiUrl}>
                    <a href={upiUrl}>
                        <Image src="https://placehold.co/24x24.png" alt="GPay" width={24} height={24} className="mr-2" data-ai-hint="google pay logo"/>
                        Google Pay
                    </a>
                </Button>
                <Button variant="outline" className="w-full h-12 border-teal-600 text-teal-600 font-bold hover:bg-teal-50">
                    <RefreshCw className="mr-2 h-5 w-5"/>
                    Refresh Wallet
                </Button>
            </footer>
        </div>
    );
}


export default function PaymentQRPage() {
    return (
        <Suspense fallback={<div className="dark flex h-screen w-full items-center justify-center bg-background"><Loader className="h-10 w-10 text-primary" /></div>}>
            <PaymentQRContent />
        </Suspense>
    );
}
