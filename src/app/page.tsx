import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#020617] font-display text-slate-200 antialiased">
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(36, 99, 235, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(36, 99, 235, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Topography pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M30 15c2.5 0 4.5-2 4.5-4.5S32.5 6 30 6s-4.5 2-4.5 4.5 2 4.5 4.5 4.5zm0 30c2.5 0 4.5-2 4.5-4.5s-2-4.5-4.5-4.5-4.5 2-4.5 4.5 2 4.5 4.5 4.5z' fill='%232463eb' fill-opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="fixed w-full top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="material-icons text-white text-xl">shield</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">CivicGuard</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">System Operational</span>
            </div>
          </div>
        </div>
      </header>

      <section className="flex-grow flex flex-col justify-center pt-28 pb-20 relative">
        {/* Hero glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
              <span className="material-icons text-base">bolt</span>
              Crisis Response Active
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              Identity for the{' '}
              <span className="text-primary relative">
                Faceless
                <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-80" />
              </span>
              .
              <br />
              Trust for the Crisis.
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Rapidly deploy secure, offline-first identity verification for disaster relief zones. Ensure aid reaches the right hands with zero-knowledge privacy protocols.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full flex-wrap">
              <Link
                href="/auth?role=user"
                className="group w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-[0_0_30px_rgba(36,99,235,0.4)] hover:shadow-[0_0_40px_rgba(36,99,235,0.5)] transition-all duration-300 flex items-center justify-center gap-3 text-lg border border-primary/30"
              >
                <span className="material-icons text-2xl">volunteer_activism</span>
                Volunteer Login
                <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <Link
                href="/auth?role=verifier"
                className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 hover:border-primary/50 text-slate-200 hover:text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 text-lg"
              >
                <span className="material-icons text-2xl">verified_user</span>
                Issuer Portal
              </Link>
              <Link
                href="/verifier"
                className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 hover:border-primary/50 text-slate-200 hover:text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 text-lg"
              >
                <span className="material-icons text-2xl">qr_code_scanner</span>
                Verifier Mode
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(36,99,235,0.1)]">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                <span className="material-icons text-primary text-3xl">wifi_off</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Offline Capable</h3>
              <p className="text-slate-400 leading-relaxed">
                Designed for zero-connectivity zones. Syncs securely when connection is restored. No data loss.
              </p>
            </div>
            <div className="group p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(36,99,235,0.1)]">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                <span className="material-icons text-primary text-3xl">fingerprint</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Zero-Knowledge Proofs</h3>
              <p className="text-slate-400 leading-relaxed">
                Verify eligibility without revealing sensitive PII. Cryptographically secure and privacy-focused.
              </p>
            </div>
            <div className="group p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(36,99,235,0.1)]">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/30 transition-colors">
                <span className="material-icons text-primary text-3xl">rocket_launch</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rapid Deployment</h3>
              <p className="text-slate-400 leading-relaxed">
                Set up in minutes. Scan QR codes to verify volunteers and beneficiaries instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800/50 py-10 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-icons text-slate-500 text-lg">lock</span>
              <span className="text-sm text-slate-500 font-mono">End-to-End Encrypted</span>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">
                CivicGuard v1.0 • Powered by <span className="font-semibold text-slate-400">Polygon zkEVM</span> & <span className="font-semibold text-slate-400">DigiLocker</span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <a className="text-sm text-slate-500 hover:text-primary transition-colors" href="#">Privacy Policy</a>
              <a className="text-sm text-slate-500 hover:text-primary transition-colors" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
