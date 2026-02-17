'use client';

import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background p-4 perspective">
      <AuthForm mode="login" />
    </main>
  );
}
