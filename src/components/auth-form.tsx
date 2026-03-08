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
import React, { useRef, useEffect } from 'react';

const formSchema = z.object({
  username: z.string().min(3, 'Name must be at least 3 characters.').regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters.').optional().or(z.literal('')),
  mobile: z.string().length(10, { message: 'Mobile number must be exactly 10 digits.' }).regex(/^\d+$/, 'Invalid mobile number.'),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }).optional().or(z.literal('')),
  referralCode: z.string().optional().or(z.literal('')),
  otp: z.string().optional().or(z.literal('')),
});

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [signupStep, setSignupStep] = React.useState<'info' | 'otp' | 'password'>('info');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);

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

  // Aggressively clear OTP field when entering OTP step
  useEffect(() => {
    if (signupStep === 'otp') {
      const timer = setTimeout(() => {
        setValue('otp', '', { shouldValidate: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [signupStep, setValue]);

  const initRecaptcha = () => {
    const container = document.getElementById('signup-recaptcha-container');
    if (!container) return null;

    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
        'size': 'invisible',
        'callback': () => {},
        'expired-callback': () => {
          recaptchaVerifierRef.current = null;
        }
      });
    }
    return recaptchaVerifierRef.current;
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
        toast({ 
          variant: 'destructive', 
          title: 'Account Exists', 
          description: 'This number is already registered. Please login.' 
        });
        setIsVerifying(false);
        return;
      }

      const verifier = initRecaptcha();
      if (!verifier) throw new Error("Captcha initialization failed. Please refresh.");

      const phoneNumber = `+91${mobile}`;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(confirmation);
      setSignupStep('otp');
      toast({ title: 'OTP Sent', description: `Code sent to +91 ${mobile}` });
    } catch (error: any) {
      console.error("OTP Error:", error);
      let message = error.message || 'Failed to send OTP. Try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
          message = 'The mobile number entered is wrong or invalid.';
      } else if (error.code === 'auth/too-many-requests') {
          message = 'Too many requests. Please wait 15-20 minutes.';
      } else if (error.code === 'auth/quota-exceeded') {
          message = 'SMS quota exceeded. Please contact admin.';
      }
      
      toast({ variant: 'destructive', title: 'Error', description: message });
      recaptchaVerifierRef.current = null;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otp = watch('otp');
    if (!otp || otp.length !== 6) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Enter 6-digit code.' });
      return;
    }

    if (!confirmationResult) return;

    setIsVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      setSignupStep('password');
      toast({ title: 'Mobile Verified', description: 'Now set your password.', className: 'bg-green-600 text-white' });
    } catch (error: any) {
      console.error("Verification Error:", error);
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code you entered is incorrect.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const email = `${values.mobile.replace(/\s/g, '')}@authcanvas.dev`;

      if (mode === 'signup') {
        if (signupStep !== 'password') return;
        if (!values.password || values.password.length < 6) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid password (min 6 chars).' });
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Authentication session expired. Please restart.");

        let referredBy = null;
        if (values.referralCode) {
            const referralCode = values.referralCode.trim();
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('referralCode', '==', referralCode));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                referredBy = querySnapshot.docs[0].id;
            } else {
                 toast({ variant: 'destructive', title: 'Invalid Referral Code', description: 'The referral code is not valid.' });
                 return;
            }
        }
        
        const credential = EmailAuthProvider.credential(email, values.password);
        await linkWithCredential(currentUser, credential);
        await updateProfile(currentUser, { displayName: values.username });
        
        const userDocRef = doc(db, "users", currentUser.uid);
        const statsDocRef = doc(db, 'app-stats', 'dashboard');
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        
        await runTransaction(db, async (transaction) => {
            const statsDoc = await transaction.get(statsDocRef);
            const settingsDoc = await transaction.get(settingsDocRef);
            
            if (!statsDoc.exists()) {
                transaction.set(statsDocRef, { totalUsers: 1, totalGames: 0, totalBalance: 0 });
            } else {
                transaction.update(statsDocRef, { totalUsers: increment(1) });
            }
            
            const welcomeBonusSettings = settingsDoc.exists() ? settingsDoc.data().welcomeBonus : { enabled: false, amount: 0 };
            let welcomeBonusAmount = (welcomeBonusSettings?.enabled && welcomeBonusSettings?.amount > 0) ? welcomeBonusSettings.amount : 0;

            transaction.set(userDocRef, {
                uid: currentUser.uid,
                displayName: values.username,
                mobile: values.mobile,
                email: email,
                balance: 0,
                bonusBalance: welcomeBonusAmount,
                totalBonusGiven: welcomeBonusAmount,
                isAdmin: false,
                isBlocked: false,
                createdAt: serverTimestamp(),
                referralCode: currentUser.uid.substring(0, 8).toUpperCase(),
                referredBy: referredBy,
                hasDeposited: false,
            });

            if (welcomeBonusAmount > 0) {
              const newBonusTransactionRef = doc(collection(db, 'bonusTransactions'));
              transaction.set(newBonusTransactionRef, {
                  userId: currentUser.uid,
                  displayName: values.username,
                  mobile: values.mobile,
                  amount: welcomeBonusAmount,
                  type: 'Given',
                  description: 'Welcome bonus on signup.',
                  createdAt: serverTimestamp(),
              });
            }
        });
        toast({ title: 'Welcome!', description: 'Account created successfully.' });
      } else {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("mobile", "==", values.mobile));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ 
                variant: 'destructive', 
                title: 'Not Registered', 
                description: 'This mobile number is not registered. Please Signup first.' 
            });
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, values.password!);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

        if (userDoc.exists() && userDoc.data().isBlocked) {
            await auth.signOut();
            throw new Error("Your account has been blocked. Contact support.");
        }
      }
      router.push('/');
    } catch (error: any) {
      console.error(error);
      let errorMessage = error.message || 'Authentication failed.';
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'This number is not registered.';
      }
      
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    }
  };

  return (
    <Card className="w-full max-w-sm bg-[#1A2C3D] border-t-2 border-orange-400 rounded-2xl shadow-2xl transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-10">
      <div id="signup-recaptcha-container"></div>
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-3xl font-bold text-white">
          {mode === 'login' ? 'Welcome Back' : 'Join Matka King'}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {mode === 'login' 
            ? 'Sign in using your mobile number' 
            : signupStep === 'info' ? 'Step 1: Enter your details'
            : signupStep === 'otp' ? `Step 2: Verify +91 ${mobile}`
            : 'Step 3: Secure your account'
          }
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
            {mode === 'signup' ? (
              <>
                {signupStep === 'info' && (
                  <div key="step-info" className="space-y-4 animate-in fade-in slide-in-from-right-5">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input placeholder="Your Name" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Mobile Number</FormLabel>
                          <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <FormControl>
                                  <Input type="tel" placeholder="10-digit number" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" maxLength={10} autoComplete="tel" />
                              </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="referralCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Referral Code (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input placeholder="Enter code" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" onClick={handleSendOTP} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl" disabled={isVerifying}>
                      {isVerifying && <Loader className="mr-2 h-4 w-4" />}
                      Send Verification OTP
                    </Button>
                  </div>
                )}

                {signupStep === 'otp' && (
                  <div key="step-otp" className="space-y-4 animate-in fade-in slide-in-from-right-5 text-center">
                    <div className="flex justify-center mb-2">
                      <ShieldCheck className="h-12 w-12 text-orange-500" />
                    </div>
                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Enter 6-Digit OTP</FormLabel>
                          <FormControl>
                            <Input 
                              id="signup-otp-input"
                              placeholder="000000" 
                              {...field} 
                              className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-14 text-center text-2xl font-black tracking-widest rounded-xl" 
                              maxLength={6}
                              autoComplete="one-time-code"
                              inputMode="numeric"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" onClick={handleVerifyOTP} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl" disabled={isVerifying}>
                      {isVerifying && <Loader className="mr-2 h-4 w-4" />}
                      Verify & Continue
                    </Button>
                    <Button variant="link" className="text-orange-400 text-xs" onClick={() => setSignupStep('info')}>
                      Change Number?
                    </Button>
                  </div>
                )}

                {signupStep === 'password' && (
                  <div key="step-password" className="space-y-4 animate-in fade-in slide-in-from-right-5">
                    <div className="flex items-center gap-2 bg-green-500/10 p-3 rounded-lg border border-green-500/20 mb-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 text-sm font-semibold">Verified +91 {mobile}</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Set Login Password</FormLabel>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <FormControl>
                              <Input type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10 pr-10" autoComplete="new-password" />
                            </FormControl>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl" disabled={isSubmitting}>
                      {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
                      Finalize Registration
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Mobile Number</FormLabel>
                      <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <FormControl>
                              <Input type="tel" placeholder="Enter your number" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10" maxLength={10} autoComplete="tel" />
                          </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} className="bg-[#2A3B4C] border-[#3A4B5C] text-white h-12 rounded-lg pl-10 pr-10" autoComplete="current-password" />
                        </FormControl>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl" disabled={isSubmitting}>
                  {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col pt-2 px-6 pb-6">
            <p className="text-center text-sm text-gray-400">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <Link href={mode === 'login' ? '/signup' : '/login'} className="font-semibold text-orange-400 hover:underline">
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </Link>
            </p>
            {mode === 'login' && (
              <p className="mt-4 text-center text-sm">
                <Link href="/forgot-password">
                  <span className="text-orange-400 hover:underline cursor-pointer">Forgot Password?</span>
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
