
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, type User as FirebaseAuthUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
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
import { ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UpdateProfileDialog } from '@/components/update-profile-dialog';
import { AddPointsDialog } from '@/components/add-points-dialog';

interface UserProfile extends DocumentData {
  balance?: number;
}

export default function ProfilePage() {
  const { user: authUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    if (loading) return;
    if (!authUser) {
      router.replace('/login');
    } else {
      setUser(authUser);
    }
  }, [authUser, loading, router]);

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

  if (loading || !user) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const handlePasswordReset = async () => {
    if (user?.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
          title: 'Password Reset Email Sent',
          description:
            'A link to reset your password has been sent to your registered email.',
        });
      } catch (error) {
        console.error('Error sending password reset email:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to send password reset email. Please try again.',
        });
      }
    }
  };
  
  const handleUserUpdate = (updatedUser: FirebaseAuthUser) => {
    setUser(updatedUser);
  };

  const mobileNumber = user.email?.split('@')[0];
  const creationDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'N/A';
  
  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl">My Profile</CardTitle>
            <CardDescription>
              View your profile, manage funds, and update your settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-center mb-6">
                <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
    
            <div className="border border-white/20 rounded-lg p-6 space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                        Username
                        </label>
                        <p className="text-lg font-semibold">{user.displayName}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                        Mobile Number
                        </label>
                        <p className="text-lg font-semibold">+91 {mobileNumber}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                        Joined
                        </label>
                        <p className="text-lg font-semibold">{creationDate}</p>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-muted-foreground">
                        Current Balance
                        </label>
                        <p className="text-2xl font-bold text-primary">₹{profile.balance || 0}</p>
                    </div>
                </div>
            </div>
    
            <div className="space-y-4">
                <AddPointsDialog user={user}>
                    <Button className="w-full h-16 bg-green-500 hover:bg-green-600 text-white font-bold text-lg flex items-center gap-3">
                        <Wallet className="h-7 w-7" />
                        Add Points (Fund Wallet)
                    </Button>
                </AddPointsDialog>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UpdateProfileDialog user={user} onUserUpdate={handleUserUpdate}>
                        <Button variant="outline" className="w-full h-12 text-base">
                            Edit Profile
                        </Button>
                    </UpdateProfileDialog>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full h-12 text-base">
                            Change Password
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Change Password?</AlertDialogTitle>
                            <AlertDialogDescription>
                            A password reset link will be sent to your registered
                            email address. Are you sure you want to continue?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handlePasswordReset}>
                            Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
