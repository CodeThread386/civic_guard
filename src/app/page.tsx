import Link from 'next/link';
import { User, ShieldCheck, QrCode } from 'lucide-react';

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900/20 to-slate-900"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #0f172a, rgba(19, 78, 74, 0.25), #0f172a)',
      }}
    >
      <div className="text-center space-y-6 max-w-lg mx-auto px-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          CivicGuard
        </h1>
        <p className="text-slate-400 text-lg">
          Blockchain-based document verification and issuance platform
        </p>
        <div className="grid gap-4 pt-4">
          <Link
            href="/auth?role=user"
            className="flex items-center gap-4 p-6 bg-slate-800/80 hover:bg-teal-600/30 border border-slate-600 hover:border-teal-500 rounded-xl transition-colors text-left group"
          >
            <div className="p-3 bg-teal-600/20 rounded-lg group-hover:bg-teal-500/30">
              <User className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">User (Volunteer)</h2>
              <p className="text-sm text-slate-400">Request and store documents</p>
            </div>
          </Link>
          <Link
            href="/auth?role=verifier"
            className="flex items-center gap-4 p-6 bg-slate-800/80 hover:bg-teal-600/30 border border-slate-600 hover:border-teal-500 rounded-xl transition-colors text-left group"
          >
            <div className="p-3 bg-teal-600/20 rounded-lg group-hover:bg-teal-500/30">
              <ShieldCheck className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Issuer</h2>
              <p className="text-sm text-slate-400">Verify and issue documents to volunteers</p>
            </div>
          </Link>
          <Link
            href="/verifier"
            className="flex items-center gap-4 p-6 bg-slate-800/80 hover:bg-teal-600/30 border border-slate-600 hover:border-teal-500 rounded-xl transition-colors text-left group"
          >
            <div className="p-3 bg-teal-600/20 rounded-lg group-hover:bg-teal-500/30">
              <QrCode className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Verify Documents</h2>
              <p className="text-sm text-slate-400">Scan QR code to verify documents (no login)</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
