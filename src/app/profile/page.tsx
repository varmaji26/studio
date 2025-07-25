
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { ArrowLeft, User, Edit, PlusCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading || !user) {
    return (
      <div className="dark flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const mobileNumber = user.email?.split('@')[0];
  const creationDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'N/A';
  const userInitial = user.displayName?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-primary mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">My Profile</CardTitle>
            <CardDescription>View and update your profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 text-4xl">
                <AvatarImage src={`https://placehold.co/100x100.png`} />
                <AvatarFallback className="bg-primary/20 text-primary">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{user.displayName}</h2>
                <p className="text-muted-foreground">+91 {mobileNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <p className="text-lg font-semibold">{user.displayName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
                  <p className="text-lg font-semibold">+91 {mobileNumber}</p>
                </div>
              </div>
              <div className="space-y-4">
                 <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Balance</label>
                  <p className="text-lg font-semibold">₹0</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Joined</label>
                  <p className="text-lg font-semibold">{creationDate}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <Button variant="outline" className="h-12">
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button variant="outline" className="h-12">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Points
              </Button>
              <Button variant="outline" className="h-12">
                <KeyRound className="mr-2 h-4 w-4" /> Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
