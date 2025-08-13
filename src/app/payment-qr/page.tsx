
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, HelpCircle, Loader, Scan, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, onSnapshot, DocumentData, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AppSettings extends DocumentData {
    upiId?: string;
    whatsappNumber?: string;
    paymentDetails?: {
        GPay?: { imageUrl: string; };
        Paytm?: { imageUrl: string; };
        PhonePe?: { imageUrl: string; };
    }
}

function PaymentQRContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get('amount');
    const { user } = useAuth();
    const { toast } = useToast();
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
    const [transactionId, setTransactionId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
            QRCode.toDataURL(upiUrl)
                .then(url => setQrCodeDataUrl(url))
                .catch(err => console.error(err));
        }
    }, [settings, amount, user]);

    useEffect(() => {
        if (timeLeft === 0) return;
        const timerId = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    const handleContactSupport = () => {
        if (settings?.whatsappNumber) {
            window.open(`https://wa.me/${settings.whatsappNumber}?text=I%20need%20help%20with%20my%20payment.`, '_blank');
        } else {
            toast({
                variant: 'destructive',
                title: 'Support Not Available',
                description: 'Support contact number is not configured.'
            });
        }
    }

    const handleSubmitForVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId) {
            toast({
                variant: 'destructive',
                title: 'Transaction ID Required',
                description: 'Please enter the transaction ID from your UPI app.',
            });
            return;
        }
        if (!user || !amount) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'deposits'), {
                userId: user.uid,
                displayName: user.displayName,
                mobile: user.email?.split('@')[0],
                amount: parseInt(amount, 10),
                paymentMethod: 'UPI',
                transactionId: transactionId,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            toast({
                title: 'Request Submitted!',
                description: 'Your deposit request has been sent. It will be reflected in your wallet after admin approval.',
            });
            router.push('/');
        } catch (error) {
            console.error('Error submitting deposit request: ', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to submit request. Please try again or contact support.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePayWithSpecificApp = (app: 'gpay' | 'paytm' | 'phonepe') => {
        if (settings?.upiId && amount) {
            const payeeName = "Matka King";
            const baseParams = `pa=${settings.upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Payment for Matka King`;

            const upiUrls = {
                gpay: `tez://upi/pay?${baseParams}`,
                paytm: `paytmmp://upi/pay?${baseParams}`,
                phonepe: `phonepe://pay?${baseParams}`
            };

            window.location.href = upiUrls[app];
        } else {
            toast({
                variant: 'destructive',
                title: 'Payment Error',
                description: 'UPI ID is not configured. Please contact support.',
            });
        }
    };

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
                <h1 className="text-xl font-bold">Complete Payment</h1>
                <div className="w-10"></div>
            </header>
            <main className="flex-1 p-4 bg-white">
                <div className="max-w-xs mx-auto">
                    
                    <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
                        <div className="flex items-center gap-2 text-gray-700">
                           <Scan className="h-5 w-5"/>
                           <span className="font-semibold">Scan QR or use a UPI app to Pay</span>
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
                        
                         <div className="flex justify-around items-center">
                             <Button variant="ghost" className="h-20 w-1/3 p-0 overflow-hidden relative hover:bg-transparent focus:bg-transparent" onClick={() => handlePayWithSpecificApp('gpay')}>
                                {settings?.paymentDetails?.GPay?.imageUrl ? (
                                    <Image src={settings.paymentDetails.GPay.imageUrl} alt="GPay" layout="fill" objectFit="contain" unoptimized />
                                ) : (
                                    <Image src="https://placehold.co/100x70.png" data-ai-hint="google pay logo" alt="GPay" layout="fill" objectFit="contain" />
                                )}
                            </Button>
                             <Button variant="ghost" className="h-20 w-1/3 p-0 overflow-hidden relative hover:bg-transparent focus:bg-transparent" onClick={() => handlePayWithSpecificApp('paytm')}>
                                {settings?.paymentDetails?.Paytm?.imageUrl ? (
                                    <Image src={settings.paymentDetails.Paytm.imageUrl} alt="Paytm" layout="fill" objectFit="contain" unoptimized />
                                ) : (
                                    <Image src="https://placehold.co/100x70.png" data-ai-hint="paytm logo" alt="Paytm" layout="fill" objectFit="contain" />
                                )}
                            </Button>
                             <Button variant="ghost" className="h-20 w-1/3 p-0 overflow-hidden relative hover:bg-transparent focus:bg-transparent" onClick={() => handlePayWithSpecificApp('phonepe')}>
                                {settings?.paymentDetails?.PhonePe?.imageUrl ? (
                                    <Image src={settings.paymentDetails.PhonePe.imageUrl} alt="PhonePe" layout="fill" objectFit="contain" unoptimized />
                                ) : (
                                     <Image src="https://placehold.co/100x70.png" data-ai-hint="phonepe logo" alt="PhonePe" layout="fill" objectFit="contain" />
                                )}
                            </Button>
                         </div>
                        
                        <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded-md flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>This session is valid for: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
                        </div>
                        
                        <div className="border-t pt-4 space-y-2">
                           <div className="flex items-center gap-2 font-semibold text-gray-800">
                               <FileText className="h-5 w-5 text-gray-500"/>
                               <h3>After Payment, Submit Details</h3>
                           </div>
                           <form onSubmit={handleSubmitForVerification} className="space-y-3">
                               <div>
                                   <label htmlFor="transactionId" className="text-sm font-medium text-gray-700">Transaction ID / UTR Number</label>
                                   <Input 
                                        id="transactionId"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter 12-digit UTR number"
                                        className="mt-1 bg-white text-black"
                                        required
                                   />
                               </div>
                               <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold" disabled={isSubmitting}>
                                   {isSubmitting ? <Loader className="mr-2 h-5 w-5"/> : null}
                                   {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                               </Button>
                           </form>
                        </div>

                        <div className="text-center text-sm text-gray-500 space-y-1 pt-2">
                           <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500"/> 100% Secure Payment</p>
                           <button onClick={handleContactSupport} className="flex items-center justify-center gap-1 text-blue-600"><HelpCircle className="h-4 w-4"/> Need help? Contact Support</button>
                        </div>
                    </div>
                </div>
            </main>
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
