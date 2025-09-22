
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Landmark, Phone, Gift, Wallet, Info } from 'lucide-react';
import Link from 'next/link';
import { doc, onSnapshot, DocumentData, collection, addDoc, serverTimestamp, runTransaction, query, where, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UserProfile extends DocumentData {
  balance?: number;
  bonusBalance?: number;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

export default function WithdrawalPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile>({});
    const [settings, setSettings] = useState<AppSettings>({});
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);

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

        const pendingWithdrawalsQuery = query(
            collection(db, 'withdrawals'),
            where('userId', '==', user.uid),
            where('status', '==', 'pending')
        );
        const unsubscribePendingWithdrawals = onSnapshot(pendingWithdrawalsQuery, (snapshot) => {
            setHasPendingWithdrawal(!snapshot.empty);
        });

        return () => {
            unsubscribeUser();
            unsubscribeSettings();
            unsubscribePendingWithdrawals();
        };
    }, [user]);

    const handleQuickAmount = (value: string) => {
        setAmount(value);
    };

    const handleSendRequest = async () => {
        if (hasPendingWithdrawal) {
            toast({
                variant: 'destructive',
                title: 'Pending Request',
                description: 'You already have a pending withdrawal request. Please wait for it to be processed.',
            });
            return;
        }

        const parsedAmount = parseInt(amount, 10);
        if (isNaN(parsedAmount) || parsedAmount < 1000) {
            toast({
                variant: 'destructive',
                title: 'Invalid Amount',
                description: 'Minimum withdrawal amount is ₹1000.',
            });
            return;
        }
        
        const currentBalance = profile.balance || 0;
        if (currentBalance < parsedAmount) {
             toast({
                variant: 'destructive',
                title: 'Insufficient Balance',
                description: 'You do not have enough real balance to make this withdrawal.',
            });
            return;
        }


        if (!user) return;
        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.uid);

        try {
             await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                 if (!userDoc.exists()) {
                    throw new Error("User not found.");
                }
                
                const currentRealBalance = userDoc.data().balance || 0;
                if (currentRealBalance < parsedAmount) {
                    throw new Error("Insufficient balance to proceed with withdrawal.");
                }

                const bonusToReset = userDoc.data().bonusBalance || 0;
                const withdrawalsCollectionRef = collection(db, 'withdrawals');
                
                // Just create the withdrawal request, don't deduct balance.
                transaction.set(doc(withdrawalsCollectionRef), {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: user.email?.split('@')[0],
                    amount: parsedAmount,
                    withdrawalMethod: 'Bank Transfer',
                    withdrawalDetails: 'Registered Bank Account',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });

                // Reset bonus balance if any
                if (bonusToReset > 0) {
                    const newBonusTransactionRef = doc(collection(db, 'bonusTransactions'));
                    transaction.set(newBonusTransactionRef, {
                        userId: user.uid,
                        displayName: user.displayName,
                        mobile: user.email?.split('@')[0],
                        amount: bonusToReset,
                        type: 'Reset',
                        description: 'Bonus reset on withdrawal request',
                        createdAt: serverTimestamp(),
                    });
                    transaction.update(userDocRef, { bonusBalance: 0 });
                }
            });

            toast({
                title: 'Request Sent!',
                description: 'Your withdrawal request has been submitted for approval.',
            });
            router.push('/funds');

        } catch (error: any) {
            console.error("Error sending withdrawal request:", error);
            toast({
                variant: 'destructive',
                title: 'Request Failed',
                description: error.message || 'Could not send your request. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
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
            <div className="dark flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-20 w-20 text-primary" />
            </div>
        );
    }
    
    const mobileNumber = user.email?.split('@')[0];
    const totalBalance = (profile.balance || 0) + (profile.bonusBalance || 0);

    return (
        <div className="dark min-h-screen bg-gray-200 text-black flex flex-col">
            <header className="p-4 flex items-center gap-4 bg-white sticky top-0 z-10 shadow-sm">
                <Link href="/funds">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Withdrawal Fund</h1>
                <div className="ml-auto flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full">
                    <Wallet className="h-5 w-5" />
                    <span>₹{totalBalance.toFixed(1) || '0.0'}</span>
                </div>
            </header>

            <main className="flex-1 p-4">
                 <div className="bg-[#112a45] text-white rounded-lg p-4 text-center">
                    <h2 className="text-lg font-bold">{user.displayName}</h2>
                    <p className="text-lg">{mobileNumber}</p>
                    <div className="bg-black/50 mt-2 p-2 rounded-md">
                        <p className="text-sm">Withdrawable Balance</p>
                        <p className="text-xl font-bold">₹ {profile.balance?.toFixed(1) || '0.0'}</p>
                    </div>
                </div>

                 <div className="text-center my-4 p-4 rounded-lg bg-green-100 border border-green-200">
                    <p className="text-sm text-green-800 font-semibold">For Fund Query's please Call Or Whatsapp</p>
                    <div className="flex justify-center gap-4 mt-2">
                        {settings.callSupportNumber && (
                             <Button className="rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={handleCall}>
                                <Phone className="mr-2 h-4 w-4" /> Call
                            </Button>
                        )}
                         {settings.whatsappNumber && (
                             <Button className="rounded-full bg-[#25D366] hover:bg-[#1EBE55] text-white" onClick={handleWhatsapp}>
                                <svg height="32" width="32" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" fill="currentColor" className="mr-2"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style={{fill:'#EDEDED'}} d="M0,512l35.31-128C12.359,344.276,0,300.138,0,254.234C0,114.759,114.759,0,255.117,0 S512,114.759,512,254.234S395.476,512,255.117,512c-44.138,0-86.51-14.124-124.469-35.31L0,512z"></path> <path style={{fill:'#55CD6C'}} d="M137.71,430.786l7.945,4.414c32.662,20.303,70.621,32.662,110.345,32.662 c115.641,0,211.862-96.221,211.862-213.628S371.641,44.138,255.117,44.138S44.138,137.71,44.138,254.234 c0,40.607,11.476,80.331,32.662,113.876l5.297,7.945l-20.303,74.152L137.71,430.786z"></path> <path style={{fill:'#FEFEFE'}} d="M187.145,135.945l-16.772-0.883c-5.297,0-10.593,1.766-14.124,5.297 c-7.945,7.062-21.186,20.303-24.717,37.959c-6.179,26.483,3.531,58.262,26.483,90.041s67.09,82.979,144.772,105.048 c24.717,7.062,44.138,2.648,60.028-7.062c12.359-7.945,20.303-20.303,22.952-33.545l2.648-12.359 c0.883-3.531-0.883-7.945-4.414-9.71l-55.614-25.6c-3.531-1.766-7.945-0.883-10.593,2.648l-22.069,28.248 c-1.766,1.766-4.414,2.648-7.062,1.766c-15.007-5.297-65.324-26.483-92.69-79.448c-0.883-2.648-0.883-5.297,0.883-7.062 l21.186-23.834c1.766-2.648,2.648-6.179,1.766-8.828l-25.6-57.379C193.324,138.593,190.676,135.945,187.145,135.945"></path> </g></svg>
                                Whatsapp
                            </Button>
                         )}
                    </div>
                </div>
                
                <hr className="border-gray-300" />
                
                {hasPendingWithdrawal ? (
                     <Alert variant="destructive" className="my-4 bg-yellow-100 border-yellow-200 text-yellow-800">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Pending Request</AlertTitle>
                        <AlertDescription>
                            You already have a pending withdrawal request. Please wait for it to be processed before making a new one.
                        </AlertDescription>
                    </Alert>
                ) : (
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
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('1000')}>1000</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('2000')}>2000</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('5000')}>5000</Button>
                        <Button variant="outline" className="rounded-full bg-white h-12" onClick={() => handleQuickAmount('10000')}>10000</Button>
                    </div>
                </div>
                )}
            </main>

            <footer className="p-4 bg-white sticky bottom-0">
                <Button 
                    className="w-full h-14 bg-[#112a45] hover:bg-[#0b1c2e] text-white font-bold text-lg rounded-full"
                    onClick={handleSendRequest}
                    disabled={isSubmitting || hasPendingWithdrawal}
                >
                    {isSubmitting && <Loader className="mr-2 h-5 w-5"/>}
                    {isSubmitting ? 'Sending...' : hasPendingWithdrawal ? 'Pending Request' : 'Send Request'}
                </Button>
            </footer>
        </div>
    );
}
