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
import React, { useEffect, useState } from 'react';

// Global type augmentation
declare global {
  interface Window {
    authRecaptcha?: RecaptchaVerifier | null;
    authConfirmationResult?: ConfirmationResult | null;
  }
}

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

  const initRecaptcha = () => {
    const container = document.getElementById('auth-recaptcha-anchor');
    if (!container) return null;

    try {
        if (window.authRecaptcha) {
            window.authRecaptcha.clear();
            window.authRecaptcha = null;
        }
        auth.languageCode = 'en'; 
        
        const verifier = new RecaptchaVerifier(auth, container, {
            'size': 'invisible',
            'callback': () => {},
            'expired-callback': () => {
                window.authRecaptcha = null;
            }
        });
        window.authRecaptcha = verifier;
        return verifier;
    } catch (e) {
        console.error("Recaptcha Error:", e);
        return null;
    }
  };

  const handleSendOTP = async () => {
    const isMobileValid = await trigger('mobile');
    const isNameValid = mode === 'signup' ? await trigger('username') : true;
    if (!isMobileValid || !isNameValid) return;

    setIsVerifying(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("mobile", "==", mobile));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Already Registered', description: 'This number is already registered. Please login.' });
        setIsVerifying(false);
        return;
      }

      const verifier = initRecaptcha();
      if (!verifier) throw new Error("reCAPTCHA failed to initialize.");

      const phoneNumber = `+91${mobile}`;
      window.authConfirmationResult = null; 
      
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      
      window.authConfirmationResult = confirmation;
      setSignupStep('otp');
      toast({ title: 'OTP Sent', description: `Verification code sent to +91 ${mobile}` });
    } catch (error: any) {
      console.error("OTP Error:", error);
      let message = 'Failed to send verification code.';
      if (error.code === 'auth/invalid-phone-number') message = 'The mobile number entered is wrong or invalid.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = watch('otp')?.replace(/\D/g, '').trim();
    if (!otp || otp.length !== 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter 6-digit code.' });
      return;
    }

    const confirmation = window.authConfirmationResult;
    if (!confirmation) {
      toast({ variant: 'destructive', title: 'Session Lost', description: 'Session expired. Please request a new OTP.' });
      setSignupStep('info');
      return;
    }

    setIsVerifying(true);
    try {
      await confirmation.confirm(otp);
      setSignupStep('password');
      toast({ title: 'Verified', description: 'Mobile verified. Set your password.', className: 'bg-green-600 text-white' });
    } catch (error: any) {
      console.error("OTP Verify Error:", error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Verification code does not match or has expired.' });
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
        if (!currentUser) throw new Error("Verification session lost. Please restart.");

        let referredBy = null;
        if (values.referralCode) {
            const q = query(collection(db, 'users'), where('referralCode', '==', values.referralCode.trim().toUpperCase()));
            const snap = await getDocs(q);
            if (!snap.empty) referredBy = snap.docs[0].id;
            else { toast({ variant: 'destructive', title: 'Invalid Referral', description: 'Referral code not found.' }); return; }
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
                uid: currentUser.uid, 
                displayName: values.username, 
                mobile: values.mobile, 
                email,
                balance: 0, 
                bonusBalance: bonus, 
                totalBonusGiven: bonus,
                isAdmin: false, 
                isBlocked: false, 
                createdAt: serverTimestamp(),
                referralCode: currentUser.uid.substring(0, 8).toUpperCase(),
                referredBy, 
                hasDeposited: false,
            });

            if (bonus > 0) {
              tx.set(doc(collection(db, 'bonusTransactions')), {
                  userId: currentUser.uid, 
                  displayName: values.username, 
                  mobile: values.mobile,
                  amount: bonus, 
                  type: 'Given', 
                  description: 'Welcome bonus.', 
                  createdAt: serverTimestamp(),
              });
            }
            tx.update(statsDocRef, { totalUsers: increment(1) });
        });
        toast({ title: 'Welcome!', description: 'Account created successfully.' });
      } else {
        const snap = await getDocs(query(collection(db, "users"), where("mobile", "==", values.mobile)));
        if (snap.empty) { 
            toast({ variant: 'destructive', title: 'Not Registered', description: 'This number is not registered. Please Signup.' }); 
            return; 
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, values.password!);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().isBlocked) {
            await auth.signOut();
            throw new Error("Your account is blocked.");
        }
      }
      router.replace('/');
    } catch (error: any) {
      console.error(error);
      let message = 'Authentication failed.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = 'Invalid mobile number or password.';
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  };

  return (
    <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl relative">
      <div id="auth-recaptcha-anchor" className="absolute top-0 left-0 h-0 w-0 pointer-events-none opacity-0"></div>
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
              <div key={`signup-${signupStep}`}>
                {signupStep === 'info' && (
                  <div className="space-y-4 animate-in fade-in">
                    <FormField control={form.control} name="username" render={({ field }) => (
                        <FormItem><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input placeholder="Full Name" {...field} className="bg-[#2A3B4C] text-white pl-10 h-12" autoComplete="name" /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="mobile" render={({ field }) => (
                        <FormItem><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type="tel" placeholder="Mobile Number" {...field} className="bg-[#2A3B4C] text-white pl-10 h-12" maxLength={10} autoComplete="tel" /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="referralCode" render={({ field }) => (
                        <FormItem><div className="relative"><Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input placeholder="Referral Code (Optional)" {...field} className="bg-[#2A3B4C] text-white pl-10 h-12" /></FormControl></div><FormMessage /></FormItem>
                    )} />
                    <Button type="button" onClick={handleSendOTP} className="w-full h-12 bg-orange-500 font-bold hover:bg-orange-600 transition-colors" disabled={isVerifying}>{isVerifying && <Loader className="mr-2 h-4" />}Send OTP</Button>
                  </div>
                )}
                {signupStep === 'otp' && (
                  <div className="space-y-4 animate-in fade-in text-center">
                    <FormField control={form.control} name="otp" render={({ field }) => (
                        <FormItem><FormLabel className="text-white">Enter 6-Digit OTP</FormLabel><FormControl><Input placeholder="000000" {...field} className="bg-[#2A3B4C] text-white text-3xl text-center h-16 font-black tracking-widest" maxLength={6} inputMode="numeric" autoComplete="one-time-code" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" onClick={handleVerifyOTP} className="w-full h-12 bg-green-600 font-bold hover:bg-green-700" disabled={isVerifying}>{isVerifying && <Loader className="mr-2 h-4" />}Verify Mobile</Button>
                    <Button variant="link" className="text-orange-400 text-xs" onClick={() => { setSignupStep('info'); window.authConfirmationResult = null; }}>Wrong Number? Go Back</Button>
                  </div>
                )}
                {signupStep === 'password' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="text-green-500 text-sm font-bold">Verified +91 {mobile}</span></div>
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="text-white">Set Secure Password</FormLabel><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" {...field} className="bg-[#2A3B4C] text-white pl-10 pr-10 h-12" autoComplete="new-password" /></FormControl><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4" /> : <Eye className="h-4" />}</button></div><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full h-12 bg-orange-500 font-bold hover:bg-orange-600" disabled={isSubmitting}>{isSubmitting && <Loader className="mr-2 h-4" />}Complete Registration</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type="tel" placeholder="Mobile Number" {...field} className="bg-[#2A3B4C] text-white pl-10 h-12" maxLength={10} autoComplete="tel" /></FormControl></div><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><FormControl><Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} className="bg-[#2A3B4C] text-white pl-10 pr-10 h-12" autoComplete="current-password" /></FormControl><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4" /> : <Eye className="h-4" />}</button></div><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full h-12 bg-orange-500 font-bold hover:bg-orange-600" disabled={isSubmitting}>{isSubmitting && <Loader className="mr-2 h-4" />}Sign In</Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col text-sm text-gray-400 pb-8 gap-2">
            <p>{mode === 'login' ? "New to Matka King?" : 'Already have an account?'} <Link href={mode === 'login' ? '/signup' : '/login'} className="text-orange-400 font-bold hover:underline">{mode === 'login' ? 'Register Now' : 'Login Here'}</Link></p>
            {mode === 'login' && <Link href="/forgot-password"><span className="text-orange-400 hover:underline cursor-pointer">Forgot Password?</span></Link>}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
