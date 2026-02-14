import { Suspense } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background-dark flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    }>
      {children}
    </Suspense>
  );
}
