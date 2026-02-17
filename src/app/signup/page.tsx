'use client';

import { AuthForm } from '@/components/auth-form';

export default function SignupPage() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
      <AuthForm mode="signup" />
    </main>
  );
}
