'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RequestReviewModal } from '@/components/RequestReviewModal';
import { ethers } from 'ethers';

export default function IssuerPage() {
  const router = useRouter();
  const { auth, authLoaded, logout } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string;
    documentType: string;
    userEmail: string;
    formData: Record<string, string>;
  }>>([]);
  const [reviewRequest, setReviewRequest] = useState<typeof pendingRequests[0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [completingBlockchain, setCompletingBlockchain] = useState(false);

  useEffect(() => {
    if (!authLoaded) return;
    if (!auth.isAuthenticated || auth.role !== 'verifier') {
      router.push('/auth');
    }
  }, [authLoaded, auth.isAuthenticated, auth.role, router]);

  const loadPending = async () => {
    try {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(auth.address));
      const res = await fetch(`/api/document-pending?verifierPubKeyHash=${encodeURIComponent(hash)}`);
      const data = await res.json();
      if (data.requests) {
        setPendingRequests(data.requests.map((r: {
          id: string;
          documentType: string;
          userEmail: string;
          formData?: Record<string, string>;
        }) => ({
          id: r.id,
          documentType: r.documentType,
          userEmail: r.userEmail,
          formData: r.formData || {},
        })));
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  useEffect(() => {
    if (!auth.isAuthenticated || auth.role !== 'verifier') return;
    loadPending();
    const interval = setInterval(loadPending, 5000);
    return () => clearInterval(interval);
  }, [auth.isAuthenticated, auth.role, auth.address]);

  const signAndSend = async (requestId: string, action: 'approve' | 'reject', file?: File) => {
    const message = `CivicGuard: ${action} request ${requestId}`;
    const wallet = new ethers.Wallet(auth.privateKey);
    const signature = await wallet.signMessage(message);

    if (action === 'approve' && file) {
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('action', action);
      formData.append('issuerAddress', auth.address);
      formData.append('signature', signature);
      formData.append('document', file);
      return fetch('/api/document-approve', {
        method: 'POST',
        body: formData,
      });
    }

    return fetch('/api/document-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        action,
        verifierAddress: auth.address,
        signature,
      }),
    });
  };

  const handleApprove = async (file: File) => {
    if (!reviewRequest) return;
    setActionLoading(true);
    try {
      const res = await signAndSend(reviewRequest.id, 'approve', file);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setPendingRequests((prev) => prev.filter((r) => r.id !== reviewRequest.id));
      setReviewRequest(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewRequest) return;
    setActionLoading(true);
    try {
      const res = await signAndSend(reviewRequest.id, 'reject');
      if (!res.ok) throw new Error('Failed');
      setPendingRequests((prev) => prev.filter((r) => r.id !== reviewRequest.id));
      setReviewRequest(null);
    } catch (e) {
      alert('Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  if (!authLoaded || !auth.isAuthenticated) {
    return (
      <main className="min-h-screen bg-background-dark flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  const handleCompleteBlockchain = async () => {
    if (!auth.email) return;
    setCompletingBlockchain(true);
    try {
      const res = await fetch('/api/auth/complete-blockchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const stored = JSON.parse(localStorage.getItem('civicguard_auth') || '{}');
        stored.blockchainPending = false;
        localStorage.setItem('civicguard_auth', JSON.stringify(stored));
        window.location.reload();
      } else {
        alert(data.error || 'Failed. Is Hardhat node running?');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCompletingBlockchain(false);
    }
  };

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || contractAddress.trim() === '') {
    return (
      <main className="min-h-screen bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-md p-6 bg-surface-dark rounded-xl border border-amber-600/50">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Blockchain not configured</h2>
          <p className="text-slate-400 text-sm mb-4">
            Run <code className="bg-slate-800 px-2 py-1 rounded">npm run setup-demo</code> with Hardhat node running first.
          </p>
          <p className="text-slate-500 text-xs">
            Terminal 1: <code className="bg-slate-800 px-2 py-1 rounded">npx hardhat node</code><br />
            Terminal 2: <code className="bg-slate-800 px-2 py-1 rounded">npm run setup-demo</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-dark font-display text-slate-200">
      <header className="h-16 border-b border-slate-800 bg-surface-dark flex items-center px-6 shrink-0 z-20">
        <Link href="/" className="mr-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 cursor-pointer">
          <span className="material-icons">arrow_back</span>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-icons text-xl">shield</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">CivicGuard</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Issuer Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
            <span className="material-icons text-emerald-500 text-sm">wifi</span>
            <span className="text-xs font-semibold text-slate-300">Connection Stable</span>
          </div>
          <span className="text-slate-400 text-sm">{auth.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
          >
            <span className="material-icons">logout</span>
            Logout
          </button>
        </div>
      </header>

      {auth.blockchainPending && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="p-4 bg-amber-900/30 border border-amber-600/50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-amber-200 text-sm">
              Complete blockchain registration to approve documents. Start Hardhat: <code className="bg-slate-800 px-2 py-0.5 rounded">npx hardhat node</code>
            </p>
            <button
              onClick={handleCompleteBlockchain}
              disabled={completingBlockchain}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm whitespace-nowrap"
            >
              {completingBlockchain ? 'Completing...' : 'Complete Registration'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        <section>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Pending Document Requests</h2>
          <p className="text-slate-500 text-sm mb-6">
            Review requests, verify the volunteer&apos;s details, and approve by uploading the verified document.
          </p>
          {pendingRequests.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <span className="material-icons text-slate-600 text-5xl mb-4">inbox</span>
              <p className="text-slate-400 font-medium">No pending requests</p>
              <p className="text-slate-500 text-sm mt-1">New requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="group relative bg-surface-dark border border-slate-800 rounded-xl p-5 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                        <span className="material-icons">description</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{r.documentType}</p>
                        <p className="text-slate-500 text-sm">{r.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewRequest(r)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Review
                      </button>
                      <button
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await signAndSend(r.id, 'reject');
                            setPendingRequests((prev) => prev.filter((x) => x.id !== r.id));
                          } catch {
                            alert('Failed to reject');
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {reviewRequest && (
        <RequestReviewModal
          request={reviewRequest}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReviewRequest(null)}
          loading={actionLoading}
        />
      )}
    </main>
  );
}
