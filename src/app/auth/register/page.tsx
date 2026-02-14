'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthRegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth?mode=signup');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">Redirecting to sign up...</p>
    </main>
  );
}
