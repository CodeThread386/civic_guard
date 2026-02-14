'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import type { VerifyResult, VerifyDocResult } from '@/types/verify';

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
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading verification...</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Verification Unavailable</h1>
          <p className="text-slate-400 mb-4">{error || 'Share session expired or not found.'}</p>
          <Link
            href="/verifier"
            className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg"
          >
            Go to Verifier
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">CivicGuard Verification</h1>
          <Link
            href="/verifier"
            className="px-3 py-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Verifier
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-6 bg-slate-800/80 rounded-xl border border-slate-700">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            {result.valid ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-400" />
                Verification Passed
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-400" />
                Verification Failed
              </>
            )}
          </h2>
          <p className="text-slate-500 text-sm mb-4">Address: {result.address}</p>
          <div className="space-y-2">
            {result.results.map((r) => (
              <div
                key={r.documentType}
                className={`flex items-center gap-2 p-3 rounded-lg ${!r.onChain ? 'bg-red-900/20' : 'bg-slate-800/50'
                  }`}
              >
                {r.onChain ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <span className="text-white font-medium">{r.documentType}</span>
                <span className="text-slate-400 text-sm">
                  {r.onChain ? 'On-chain verified' : 'Not found on-chain'}
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
