'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  signInWithEmailAndPassword, 
  updateProfile, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  EmailAuthProvider,
  linkWithCredential,
  type ConfirmationResult 
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, runTransaction, increment, collection, query, where, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './loader';
import { Eye, EyeOff, User, Phone, KeyRound, Gift, ShieldCheck, CheckCircle2 } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';

const formSchema = z.object({
  username: z.string().min(3, 'Name must be at least 3 characters.').regex(/^[a-zA-Z\s]+$/, 'Letters only.').optional().or(z.literal('')),
  mobile: z.string().length(10, { message: 'Enter 10-digit number.' }).regex(/^\d+$/, 'Digits only.'),
  password: z.string().min(6, { message: 'Min 6 characters.' }).optional().or(z.literal('')),
  referralCode: z.string().optional().or(z.literal('')),
  otp: z.string().optional().or(z.literal('')),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<'info' | 'otp' | 'password'>('info');
  const [isVerifying, setIsVerifying] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      mobile: '',
      password: '',
      referralCode: '',
      otp: '',
    },
  });

  const { formState: { isSubmitting }, watch, trigger, setValue } = form;
  const mobile = watch('mobile');

  // Clear OTP field when step changes
  useEffect(() => {
    if (signupStep === 'otp') {
      setValue('otp', '');
    }
  }, [signupStep, setValue]);

  const initRecaptcha = () => {
    const container = document.getElementById('auth-recaptcha-anchor');
    if (!container) return null;

    try {
        if ((window as any).authRecaptcha) {
            return (window as any).authRecaptcha;
        }
        const verifier = new RecaptchaVerifier(auth, container, {
            'size': 'invisible',
            'callback': () => {},
            'expired-callback': () => {
                (window as any).authRecaptcha = null;
            }
        });
        (window as any).authRecaptcha = verifier;
        return verifier;
    } catch (e) {
        console.error("Recaptcha Error:", e);
        return null;
    }
  };

  const handleSendOTP = async () => {
    const isMobileValid = await trigger('mobile');
    const isNameValid = await trigger('username');
    if (!isMobileValid || !isNameValid) return;

    setIsVerifying(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", mobile));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Already Registered', description: 'Please login.' });
        setIsVerifying(false);
        return;
      }

      const verifier = initRecaptcha();
      if (!verifier) throw new Error("Recaptcha init failed.");

      const phoneNumber = `+91${mobile}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      
      (window as any).authConfirmationResult = confirmation;
      setSignupStep('otp');
      toast({ title: 'OTP Sent', description: `Sent to +91 ${mobile}` });
    } catch (error: any) {
      console.error("OTP Error:", error);
      let message = error.message || 'Failed to send OTP.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Wait 15 mins.';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = watch('otp')?.replace(/\D/g, '').trim();
    if (!otp || otp.length !== 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Enter 6-digit code.' });
      return;
    }

    const confirmation = (window as any).authConfirmationResult;
    if (!confirmation) {
      toast({ variant: 'destructive', title: 'Expired', description: 'Please restart.' });
      setSignupStep('info');
      return;
    }

    setIsVerifying(true);
    try {
      await confirmation.confirm(otp);
      setSignupStep('password');
      toast({ title: 'Success', description: 'Mobile verified.', className: 'bg-green-600 text-white' });
    } catch (error: any) {
      console.error("OTP Verify Error:", error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Code does not match.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const email = `${values.mobile}@authcanvas.dev`;

      if (mode === 'signup') {
        if (signupStep !== 'password') return;
        
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Session lost. Restart.");

        let referredBy = null;
        if (values.referralCode) {
            const q = query(collection(db, 'users'), where('referralCode', '==', values.referralCode.trim()));
            const snap = await getDocs(q);
            if (!snap.empty) referredBy = snap.docs[0].id;
            else { toast({ variant: 'destructive', title: 'Invalid Referral' }); return; }
        }
        
        const credential = EmailAuthProvider.credential(email, values.password!);
        await linkWithCredential(currentUser, credential);
        await updateProfile(currentUser, { displayName: values.username });
        
        const userDocRef = doc(db, "users", currentUser.uid);
        const statsDocRef = doc(db, 'app-stats', 'dashboard');
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        
        await runTransaction(db, async (tx) => {
            const settingsDoc = await tx.get(settingsDocRef);
            const welcomeBonus = settingsDoc.exists() ? settingsDoc.data().welcomeBonus : null;
            const bonus = (welcomeBonus?.enabled && welcomeBonus?.amount > 0) ? welcomeBonus.amount : 0;

            tx.set(userDocRef, {
                uid: currentUser.uid, displayName: values.username, mobile: values.mobile, email,
                balance: 0, bonusBalance: bonus, totalBonusGiven: bonus,
                isAdmin: false, isBlocked: false, createdAt: serverTimestamp(),
                referralCode: currentUser.uid.substring(0, 8).toUpperCase(),
                referredBy, hasDeposited: false,
            });

            if (bonus > 0) {
              tx.set(doc(collection(db, 'bonusTransactions')), {
                  userId: currentUser.uid, displayName: values.username, mobile: values.mobile,
                  amount: bonus, type: 'Given', description: 'Welcome bonus.', createdAt: serverTimestamp(),
              });
            }
            tx.update(statsDocRef, { totalUsers: increment(1) });
        });
        toast({ title: 'Success', description: 'Account created.' });
      } else {
        const snap = await getDocs(query(collection(db, "users"), where("mobile", "==", values.mobile)));
        if (snap.empty) { toast({ variant: 'destructive', title: 'Not Found', description: 'Please Signup.' }); return; }

        const userCredential = await signInWithEmailAndPassword(auth, email, values.password!);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().isBlocked) {
            await auth.signOut();
            throw new Error("Account blocked. Contact support.");
        }
      }
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed.' });
    }
  };

  return (
    <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl">
      <div id="auth-recaptcha-anchor"></div>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-white">
          {mode === 'login' ? 'Welcome Back' : 'Join Matka King'}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {mode === 'login' ? 'Sign in using mobile number' : 'Create your secure account'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
            {mode === 'signup' ? (
              <>
                {signupStep === 'info' && (
                  <div className="space-y-4 animate-in fade-in">
                    <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input placeholder="Full Name" {...field} className="bg-[#2A3B4C] text-white pl-10" /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="mobile" render={({ field }) => (
                        <FormItem><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type="tel" placeholder="Mobile Number" {...field} className="bg-[#2A3B4C] text-white pl-10" maxLength={10} /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="referralCode" render={({ field }) => (
                        <FormItem><div className="relative"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input placeholder="Referral Code (Optional)" {...field} className="bg-[#2A3B4C] text-white pl-10" /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <Button type="button" onClick={handleSendOTP} className="w-full h-12 bg-orange-500 font-bold" disabled={isVerifying}>{isVerifying && <Loader className="mr-2 h-4" />}Send OTP</Button>
                  </div>
                )}
                {signupStep === 'otp' && (
                  <div className="space-y-4 animate-in fade-in text-center">
                    <FormField control={form.control} name="otp" render={({ field }) => (
                        <FormItem><FormLabel className="text-white">Enter OTP Code</FormLabel><FormControl><Input placeholder="000000" {...field} className="bg-[#2A3B4C] text-white text-2xl text-center h-14" maxLength={6} inputMode="numeric" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" onClick={handleVerifyOTP} className="w-full h-12 bg-green-600 font-bold" disabled={isVerifying}>{isVerifying && <Loader className="mr-2 h-4" />}Verify Code</Button>
                    <Button variant="link" className="text-orange-400 text-xs" onClick={() => setSignupStep('info')}>Change Number?</Button>
                  </div>
                )}
                {signupStep === 'password' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="text-green-500 text-sm">Verified +91 {mobile}</span></div>
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="text-white">Set Password</FormLabel><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" {...field} className="bg-[#2A3B4C] text-white pl-10 pr-10" /></FormControl><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="h-4" /> : <Eye className="h-4" />}</button></div><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full h-12 bg-orange-500 font-bold" disabled={isSubmitting}>{isSubmitting && <Loader className="mr-2 h-4" />}Complete Signup</Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type="tel" placeholder="Mobile Number" {...field} className="bg-[#2A3B4C] text-white pl-10" maxLength={10} /></FormControl></div><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} className="bg-[#2A3B4C] text-white pl-10 pr-10" /></FormControl><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff className="h-4" /> : <Eye className="h-4" />}</button></div><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-orange-500 font-bold" disabled={isSubmitting}>{isSubmitting && <Loader className="mr-2 h-4" />}Sign In</Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col text-sm text-gray-400 pb-8">
            <p>{mode === 'login' ? "New here?" : 'Already have an account?'} <Link href={mode === 'login' ? '/signup' : '/login'} className="text-orange-400 hover:underline">{mode === 'login' ? 'Create Account' : 'Sign In'}</Link></p>
            {mode === 'login' && <Link href="/forgot-password" title="reset password"><span className="mt-4 text-orange-400 hover:underline cursor-pointer">Forgot Password?</span></Link>}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
