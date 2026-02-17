
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { type User as FirebaseAuthUser } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { ArrowLeft, Wallet, Gift, Copy } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { UpdateProfileDialog } from '@/components/update-profile-dialog';
import { ChangePasswordDialog } from '@/components/change-password-dialog';

interface UserProfile extends DocumentData {
  balance?: number;
  bonusBalance?: number;
  referralCode?: string;
}

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser, router]);

  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    });
    
    return () => unsubscribe();
  }, [user]);
  
  const handleCopyToClipboard = () => {
    if (profile.referralCode) {
        navigator.clipboard.writeText(profile.referralCode).then(() => {
            toast({
                title: 'Copied!',
                description: 'Referral code has been copied to clipboard.',
            });
        }, (err) => {
            console.error('Could not copy text: ', err);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to copy referral code.',
            });
        });
    }
  };

  if (!user) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const handleUserUpdate = (updatedUser: FirebaseAuthUser) => {
    setUser(updatedUser);
  };

  const mobileNumber = user.phoneNumber || user.email?.split('@')[0] || 'N/A';
  const creationDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'N/A';
    
  const totalBalance = (profile.balance || 0) + (profile.bonusBalance || 0);
  
  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6 pb-28">
      <div className="max-w-xs mx-auto">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">My Profile</CardTitle>
            <CardDescription className="text-xs">
              View your profile, manage funds, and update your settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center mb-4">
                <Link href="/" replace className="inline-flex items-center gap-2 text-green-500 hover:underline text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
    
            <div className="border border-white/20 rounded-lg p-4 space-y-3 mb-4">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">
                        Username
                        </label>
                        <p className="text-sm font-semibold">{user.displayName}</p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">
                        Mobile Number
                        </label>
                        <p className="text-sm font-semibold">{mobileNumber}</p>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-muted-foreground">
                        Referral Code
                        </label>
                        <div className="flex items-center gap-1">
                           <p className="text-sm font-semibold text-primary">{profile.referralCode || 'N/A'}</p>
                           {profile.referralCode && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyToClipboard}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                           )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground">
                        Joined
                        </label>
                        <p className="text-sm font-semibold">{creationDate}</p>
                    </div>
                     <div className="col-span-1 grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                Real Balance
                            </label>
                            <p className="text-base font-bold text-green-400 flex items-center gap-1">
                               <Wallet className="h-4 w-4" /> ₹{profile.balance?.toFixed(0) || '0'}
                            </p>
                        </div>
                         <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                Bonus Balance
                            </label>
                            <p className="text-base font-bold text-amber-400 flex items-center gap-1">
                               <Gift className="h-4 w-4" /> ₹{profile.bonusBalance?.toFixed(0) || '0'}
                            </p>
                        </div>
                    </div>
                    <div className="col-span-1 border-t border-white/10 pt-2">
                        <label className="text-xs font-medium text-muted-foreground">
                            Total Balance
                        </label>
                        <p className="text-lg font-bold text-primary">
                           ₹{totalBalance.toFixed(0)}
                        </p>
                    </div>
                </div>
            </div>
    
            <div className="space-y-3">
                 <Link href="/add-fund">
                    <Button className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold text-sm flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Add Points (Fund Wallet)
                    </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                    <UpdateProfileDialog user={user} onUserUpdate={handleUserUpdate}>
                        <Button variant="outline" className="w-full h-10 text-sm">
                            Edit Profile
                        </Button>
                    </UpdateProfileDialog>
                    <ChangePasswordDialog>
                        <Button variant="outline" className="w-full h-10 text-sm">
                            Change Password
                        </Button>
                    </ChangePasswordDialog>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
