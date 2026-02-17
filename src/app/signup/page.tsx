'use client';

import { AuthForm } from '@/components/auth-form';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/loader';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (user) {
    router.replace('/');
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
      <AuthForm mode="signup" />
    </main>
  );
}
