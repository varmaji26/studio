'use client';

import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from '@/components/loader';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-20 w-20 text-primary" />
      </div>
    );
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
      <AuthForm mode="signup" />
    </main>
  );
}
