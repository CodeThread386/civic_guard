'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { VerifyResult } from '@/types/verify';

export default function VerifyResultPage() {
  const params = useParams();
  const shortId = params.shortId as string;
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shortId) return;
    fetch(`/api/verify/${shortId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Verification failed');
          return;
        }
        setResult(data);
      })
      .catch(() => setError('Failed to load verification'))
      .finally(() => setLoading(false));
  }, [shortId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background-dark font-display flex items-center justify-center">
        <p className="text-slate-400">Loading verification...</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-background-dark font-display flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-surface-dark rounded-xl border border-surface-border max-w-md w-full text-center">
          <span className="material-icons text-5xl text-red-400 mb-4 block">cancel</span>
          <h1 className="text-xl font-semibold text-white mb-2">Verification Unavailable</h1>
          <p className="text-slate-400 mb-4">{error || 'Share session expired or not found.'}</p>
          <Link
            href="/verifier"
            className="inline-block px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg"
          >
            Go to Verifier
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-dark font-display">
      <header className="border-b border-slate-800 bg-surface-dark">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="material-icons text-white text-sm">shield</span>
            </div>
            <h1 className="text-xl font-semibold text-white">CivicGuard Verification</h1>
          </div>
          <Link
            href="/verifier"
            className="px-3 py-2 text-slate-400 hover:text-primary rounded-lg transition-colors flex items-center gap-1"
          >
            <span className="material-icons text-sm">qr_code_scanner</span>
            Verifier
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-6 bg-surface-dark rounded-xl border border-surface-border">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            {result.valid ? (
              <>
                <span className="material-icons text-green-400 text-2xl">check_circle</span>
                Verification Passed
              </>
            ) : (
              <>
                <span className="material-icons text-red-400 text-2xl">cancel</span>
                Verification Failed
              </>
            )}
          </h2>
          <p className="text-slate-500 text-sm mb-4">Address: {result.address}</p>
          <div className="space-y-2">
            {(result.results || []).map((r, i) => (
              <div
                key={r?.documentType || `doc-${i}`}
                className={`flex items-center gap-2 p-3 rounded-lg ${!r?.onChain ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-800/50 border border-slate-700'}`}
              >
                {r?.onChain ? (
                  <span className="material-icons text-green-400 text-lg">check_circle</span>
                ) : (
                  <span className="material-icons text-red-400 text-lg">cancel</span>
                )}
                <span className="text-white font-medium">{r?.documentType || `Document ${i + 1}`}</span>
                <span className="text-slate-400 text-sm">
                  {r?.onChain ? 'On-chain verified' : 'Not found on-chain'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm mt-4">
            For age/expiry checks, use the Verifier page and scan the QR with filters enabled.
          </p>
        </div>
      </div>
    </main>
  );
}
