
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { ArrowLeft, Edit, PlusCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

export default function ProfilePage() {
  const { user: authUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(authUser);

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
  
  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };


  const mobileNumber = user.email?.split('@')[0];
  const creationDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'N/A';
  const userInitial = user.displayName?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary mb-6 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">My Profile</CardTitle>
            <CardDescription>
              View and update your profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 text-4xl">
                <AvatarImage src={`https://placehold.co/100x100.png`} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{user.displayName}</h2>
                <p className="text-muted-foreground">+91 {mobileNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
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
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Balance
                  </label>
                  <p className="text-lg font-semibold">₹0</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Joined
                  </label>
                  <p className="text-lg font-semibold">{creationDate}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <UpdateProfileDialog user={user} onUserUpdate={handleUserUpdate}>
                 <Button variant="outline" className="h-12">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              </UpdateProfileDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-12">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Points
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>How to Add Points?</AlertDialogTitle>
                    <AlertDialogDescription>
                      To add points to your wallet, please contact our support
                      team via WhatsApp or call us directly.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-12">
                    <KeyRound className="mr-2 h-4 w-4" /> Change Password
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
