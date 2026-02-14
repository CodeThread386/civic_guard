import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900/20 to-slate-900">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          CivicGuard
        </h1>
        <p className="text-slate-400 text-lg max-w-md">
          Blockchain-based document verification and issuance platform
        </p>
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Link
            href="/auth?mode=login"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth?mode=signup"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="/verifier"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Verify Documents (Scan QR)
          </Link>
        </div>
      </div>
    </main>
  );
}
