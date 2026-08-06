'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, HelpCircle, Loader, Scan, ShieldCheck, Copy, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { doc, onSnapshot, DocumentData, addDoc, collection, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AppSettings extends DocumentData {
    upiId?: string;
    whatsappNumber?: string;
    paymentDetails?: {
        GPay?: { imageUrl: string; enabled: boolean; };
        Paytm?: { imageUrl: string; enabled: boolean; };
        PhonePe?: { imageUrl: string; enabled: boolean; };
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [hasPendingDeposit, setHasPendingDeposit] = useState(false);

    useEffect(() => {
        const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
        const mobile = Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i));
        setIsMobile(mobile);
    }, []);

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

        if (user) {
            const pendingDepositsQuery = query(
                collection(db, 'deposits'),
                where('userId', '==', user.uid),
                where('status', '==', 'pending')
            );
            const unsubscribePending = onSnapshot(pendingDepositsQuery, (snapshot) => {
                setHasPendingDeposit(!snapshot.empty);
            });
            return () => {
                unsubscribe();
                unsubscribePending();
            };
        }
        
        return () => unsubscribe();
    }, [user]);
    
    useEffect(() => {
        if (settings && settings.upiId && amount && user) {
            const payeeName = "KALYAN777";
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

    const handleSubmitForVerification = async () => {
        if (!user || !amount) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'deposits'), {
                userId: user.uid,
                displayName: user.displayName,
                mobile: user.email?.split('@')[0],
                amount: parseInt(amount, 10),
                paymentMethod: 'UPI',
                transactionId: 'User confirmed payment',
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
    
    const getUpiUrl = (app: 'gpay' | 'paytm' | 'phonepe') => {
        if (settings?.upiId && amount) {
            const payeeName = "KALYAN777";
            const baseParams = `pa=${settings.upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Payment for KALYAN777`;

            const upiUrls = {
                gpay: `gpay://upi/pay?${baseParams}`,
                paytm: `paytmmp://upi/pay?${baseParams}`,
                phonepe: `phonepe://upi/pay?${baseParams}`
            };

            return upiUrls[app];
        }
        return '#';
    };

    const handleUpiAppClick = (event: React.MouseEvent<HTMLAnchorElement>, app: 'gpay' | 'paytm' | 'phonepe') => {
        if (!isMobile) {
            event.preventDefault();
            toast({
                title: 'Use Mobile',
                description: 'This payment option is only available on mobile devices.',
            });
            return;
        }

        if (!settings?.upiId || !amount) {
            event.preventDefault();
            toast({
                variant: 'destructive',
                title: 'Payment Error',
                description: 'UPI ID is not configured. Please contact support.',
            });
            return;
        }

        // If everything is fine, the default anchor tag behavior will proceed.
    };

    const handleCopyToClipboard = () => {
        if (settings?.upiId) {
            navigator.clipboard.writeText(settings.upiId).then(() => {
                toast({
                    title: 'Copied!',
                    description: 'UPI ID has been copied to clipboard.',
                });
            }, (err) => {
                console.error('Could not copy text: ', err);
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to copy UPI ID.',
                });
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
                    
                    <div className="bg-white p-4 rounded-lg shadow-lg space-y-3">
                        <div className="flex items-center gap-2 text-gray-700 text-center flex-col">
                           <Scan className="h-5 w-5"/>
                           <span className="font-semibold">Scan QR, Copy UPI ID, or use a UPI app to Pay</span>
                        </div>
                        
                        <p className="text-center text-3xl font-bold text-black">
                            ₹{parseFloat(amount).toFixed(2)}
                        </p>

                        <div className="flex justify-center">
                            {qrCodeDataUrl ? (
                                <Image src={qrCodeDataUrl} alt="Payment QR Code" width={200} height={200} />
                            ) : (
                                <Skeleton className="h-[200px] w-[200px]" />
                            )}
                        </div>
                        
                        {settings?.upiId && (
                            <div className="flex items-center justify-center gap-2 bg-gray-100 p-2 rounded-md">
                                <span className="text-sm font-mono text-gray-800 break-all">{settings.upiId}</span>
                                <Button size="icon" variant="ghost" onClick={handleCopyToClipboard} className="h-8 w-8">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        
                         <div className="flex justify-around items-center pt-2">
                             {settings?.paymentDetails?.GPay?.enabled && (
                                <a href={getUpiUrl('gpay')} onClick={(e) => handleUpiAppClick(e, 'gpay')} className="h-20 w-1/3 p-0 relative block">
                                    {settings?.paymentDetails?.GPay?.imageUrl ? (
                                        <Image src={settings.paymentDetails.GPay.imageUrl} alt="GPay" layout="fill" objectFit="contain" />
                                    ) : (
                                        <Image src="https://placehold.co/100x70.png" data-ai-hint="google pay logo" alt="GPay" layout="fill" objectFit="contain" />
                                    )}
                                </a>
                             )}
                              {settings?.paymentDetails?.Paytm?.enabled && (
                                <a href={getUpiUrl('paytm')} onClick={(e) => handleUpiAppClick(e, 'paytm')} className="h-20 w-1/3 p-0 relative block">
                                    {settings?.paymentDetails?.Paytm?.imageUrl ? (
                                        <Image src={settings.paymentDetails.Paytm.imageUrl} alt="Paytm" layout="fill" objectFit="contain" />
                                    ) : (
                                        <Image src="https://placehold.co/100x70.png" data-ai-hint="paytm logo" alt="Paytm" layout="fill" objectFit="contain" />
                                    )}
                                </a>
                              )}
                              {settings?.paymentDetails?.PhonePe?.enabled && (
                                <a href={getUpiUrl('phonepe')} onClick={(e) => handleUpiAppClick(e, 'phonepe')} className="h-20 w-1/3 p-0 relative block">
                                    {settings?.paymentDetails?.PhonePe?.imageUrl ? (
                                        <Image src={settings.paymentDetails.PhonePe.imageUrl} alt="PhonePe" layout="fill" objectFit="contain" />
                                    ) : (
                                        <Image src="https://placehold.co/100x70.png" data-ai-hint="phonepe logo" alt="PhonePe" layout="fill" objectFit="contain" />
                                    )}
                                </a>
                              )}
                         </div>
                        
                        <div className="bg-yellow-100 text-yellow-800 text-sm p-2 rounded-md flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>This session is valid for: {timeLeft > 0 ? `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}` : "Expired"}</span>
                        </div>
                        
                        {hasPendingDeposit ? (
                            <Alert variant="destructive" className="bg-yellow-100 border-yellow-200 text-yellow-800">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Pending Request</AlertTitle>
                                <AlertDescription>
                                    Your previous deposit request is still pending. Please wait for it to be processed.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="border-t pt-3 space-y-2">
                               <div className="flex items-center gap-2 font-semibold text-gray-800">
                                   <FileText className="h-5 w-5 text-gray-500"/>
                                   <h3>भुगतान के बाद, सत्यापन के लिए सबमिट करें</h3>
                               </div>
                               <Button onClick={handleSubmitForVerification} className="w-full h-11 bg-green-600 hover:bg-green-700 font-bold animate-shake" disabled={isSubmitting}>
                                   {isSubmitting ? <Loader className="mr-2 h-5 w-5"/> : null}
                                   {isSubmitting ? 'Submitting...' : 'Send Deposit Request'}
                               </Button>
                            </div>
                        )}

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
