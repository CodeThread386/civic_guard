'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getLocalDocumentTypes, getProcessedRequestIds, markRequestProcessed } from '@/lib/local-hashes';
import { processApprovedDocument } from '@/lib/process-approved-document';
import { UploadDocumentModal } from '@/components/UploadDocumentModal';
import { ShareModal } from '@/components/ShareModal';
import { isWebAuthnSupported, verifyLocalDevice } from '@/lib/localAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { auth, authLoaded, logout } = useAuth();
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCount, setProcessingCount] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [completingBlockchain, setCompletingBlockchain] = useState(false);
  const [verifyingBiometric, setVerifyingBiometric] = useState(false);

  useEffect(() => {
    if (!authLoaded) return;
    if (!auth.isAuthenticated || auth.role === 'verifier') {
      router.push('/auth');
    }
  }, [authLoaded, auth.isAuthenticated, auth.role, router]);

  const refreshDocuments = useCallback(async () => {
    if (!auth.address || !auth.isAuthenticated) return;
    const localTypes = getLocalDocumentTypes(auth.address);
    try {
      const { ethers } = await import('ethers');
      const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(auth.address));
      const { getUserDocumentTypes } = await import('@/lib/blockchain');
      const chainTypes = await getUserDocumentTypes(pubKeyHash);
      const chainArr = Array.isArray(chainTypes) ? chainTypes : [];
      const merged = Array.from(new Set([...localTypes, ...chainArr]));
      setDocumentTypes(merged);
    } catch (e) {
      console.error('Fetch documents error:', e);
      setDocumentTypes(localTypes);
    } finally {
      setLoading(false);
    }
  }, [auth.address, auth.isAuthenticated]);

  const fetchAndProcessApproved = useCallback(async () => {
    if (!auth.address || !auth.isAuthenticated || !auth.privateKey) return;
    try {
      const res = await fetch(`/api/document-approved-for-user?address=${encodeURIComponent(auth.address)}`);
      const data = await res.json();
      if (!res.ok || !data.requests?.length) {
        await refreshDocuments();
        return;
      }
      const processed = getProcessedRequestIds(auth.address);
      const toProcess = data.requests.filter((r: { id: string }) => !processed.includes(r.id));
      if (toProcess.length === 0) {
        await refreshDocuments();
        return;
      }
      if (auth.blockchainPending && auth.email) {
        try {
          const completeRes = await fetch('/api/auth/complete-blockchain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: auth.email }),
          });
          const completeData = await completeRes.json();
          if (completeRes.ok && completeData.success) {
            const stored = JSON.parse(localStorage.getItem('civicguard_auth') || '{}');
            stored.blockchainPending = false;
            localStorage.setItem('civicguard_auth', JSON.stringify(stored));
            window.location.reload();
            return;
          }
        } catch {
          console.warn('Could not complete blockchain registration');
        }
      }
      setProcessingCount(toProcess.length);
      for (const req of toProcess) {
        try {
          if (!req.documentContent) {
            console.warn('Skipping approved doc with missing content:', req.id);
            markRequestProcessed(req.id, auth.address);
            continue;
          }
          await processApprovedDocument(
            {
              id: req.id,
              documentContent: req.documentContent,
              documentType: req.documentType,
              verifierPubKeyHash: req.verifierPubKeyHash,
              formData: req.formData || {},
            },
            auth.privateKey
          );
          markRequestProcessed(req.id, auth.address);
          await refreshDocuments();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('already recorded') || msg.includes('Document already recorded')) {
            markRequestProcessed(req.id, auth.address);
          } else if (msg.includes('User not registered')) {
            console.warn('User not on chain - complete registration first. Doc will retry after.', req.id);
          } else {
            console.error('Process approved doc error:', req.id, e);
          }
        }
      }
      setProcessingCount(0);
    } catch (e) {
      console.error('Fetch approved error:', e);
    } finally {
      await refreshDocuments();
    }
  }, [auth.address, auth.isAuthenticated, auth.privateKey, auth.blockchainPending, auth.email, refreshDocuments]);

  useEffect(() => {
    fetchAndProcessApproved();
  }, [fetchAndProcessApproved]);

  useEffect(() => {
    if (!auth.address || !auth.isAuthenticated) return;
    const pollInterval = setInterval(fetchAndProcessApproved, 5000);
    return () => clearInterval(pollInterval);
  }, [auth.address, auth.isAuthenticated, fetchAndProcessApproved]);

  useEffect(() => {
    if (processingCount === 0 && auth.address && auth.isAuthenticated) {
      refreshDocuments();
    }
  }, [showUploadModal, showShareModal, processingCount, auth.address, auth.isAuthenticated, refreshDocuments]);

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

  const handleShareClick = async () => {
    if (documentTypes.length === 0) return;
    if (!isWebAuthnSupported()) {
      const proceed = window.confirm(
        'Biometric authentication is not supported on this browser/device. ' +
        'Your QR code will be shown without additional verification. Continue?'
      );
      if (proceed) setShowShareModal(true);
      return;
    }
    setVerifyingBiometric(true);
    try {
      await verifyLocalDevice();
      setShowShareModal(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Biometric verification failed');
    } finally {
      setVerifyingBiometric(false);
    }
  };

  const copyAddress = () => {
    if (auth.address) {
      navigator.clipboard.writeText(auth.address);
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
    <main className="min-h-screen bg-background-dark font-display text-slate-100 flex flex-col">
      <header className="w-full bg-surface-dark border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                  <span className="material-icons text-sm">shield</span>
                </div>
                <span className="hidden sm:block font-bold text-xl tracking-tight text-white">CivicGuard</span>
              </div>
              <div className="h-6 w-px bg-slate-700 hidden sm:block" />
              <span className="text-slate-400 font-medium truncate">Welcome, {auth.email?.split('@')[0] || 'User'}</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={copyAddress}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-primary transition-all duration-200"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-mono text-slate-300 group-hover:text-primary transition-colors">
                  {auth.address ? `${auth.address.slice(0, 6)}...${auth.address.slice(-4)}` : '—'}
                </span>
                <span className="material-icons text-sm text-slate-400 group-hover:text-primary transition-colors">content_copy</span>
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors relative">
                <span className="material-icons">notifications</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
              >
                <span className="material-icons">logout</span>
                <span className="hidden sm:block text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {auth.blockchainPending && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 bg-amber-900/30 border border-amber-600/50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-amber-200 text-sm">
              Complete blockchain registration to request documents. Start Hardhat node first: <code className="bg-slate-800 px-2 py-0.5 rounded">npx hardhat node</code>
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

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-dark to-background-dark border border-slate-800 shadow-xl">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2463eb 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">VERIFIED</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Status: Active Deployment</h2>
                  <p className="text-slate-400 max-w-md">
                    Your documents are verified. You are cleared for relief operations.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-2 border-green-500/20">
                    <span className="material-icons text-5xl text-green-500">verified_user</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="material-icons text-primary">bolt</span>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="group relative flex flex-col items-start p-6 rounded-xl bg-surface-dark border border-slate-800 hover:border-primary/50 hover:bg-slate-800/80 transition-all duration-300 text-left"
                >
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <span className="material-icons text-3xl">add_moderator</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">Upload Documents</h4>
                  <p className="text-sm text-slate-400 mb-4">Request documents from issuers like Aadhar, PAN, Degree, Passport.</p>
                  <div className="flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Request Document <span className="material-icons text-sm ml-1">arrow_forward</span>
                  </div>
                </button>
                <button
                  onClick={handleShareClick}
                  disabled={documentTypes.length === 0 || verifyingBiometric || auth.blockchainPending}
                  className="group relative flex flex-col items-start p-6 rounded-xl bg-surface-dark border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="mb-4 p-3 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <span className="material-icons text-3xl">qr_code_2</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">Show Digital ID</h4>
                  <p className="text-sm text-slate-400 mb-4">Generate a temporary QR code for on-site verification.</p>
                  <div className="flex items-center text-sm font-medium text-indigo-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    {verifyingBiometric ? 'Verifying...' : 'View Code'} <span className="material-icons text-sm ml-1">arrow_forward</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-surface-dark rounded-xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Your Documents</h3>
                <button onClick={() => { setLoading(true); refreshDocuments(); }} className="text-xs font-medium text-primary hover:text-primary/80 cursor-pointer">
                  Refresh
                </button>
              </div>
              <div className="space-y-4">
                {loading && processingCount === 0 ? (
                  <p className="text-slate-500 text-sm">Loading...</p>
                ) : processingCount > 0 ? (
                  <p className="text-primary text-sm">Processing {processingCount} new document(s)...</p>
                ) : documentTypes.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <span className="material-icons text-slate-600 mb-2 text-4xl">description</span>
                    <p className="text-xs text-slate-500">No documents yet</p>
                    <p className="text-xs text-slate-600 mt-1">Request from an issuer to get started</p>
                  </div>
                ) : (
                  documentTypes.map((doc, i) => (
                    <div key={`${doc}-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <span className="material-icons text-lg">badge</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{doc}</p>
                        <p className="text-xs text-slate-400">On-chain verified</p>
                      </div>
                      <span className="material-icons text-green-500 text-base" title="Verified">check_circle</span>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full mt-6 py-2.5 rounded-lg border border-dashed border-slate-600 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons text-base">add</span> Add New Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800 mt-auto py-6 bg-surface-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2024 CivicGuard. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-slate-300" href="#">Privacy Policy</a>
            <a className="hover:text-slate-300" href="#">Terms of Service</a>
          </div>
        </div>
      </footer>

      {showUploadModal && (
        <UploadDocumentModal
          userEmail={auth.email}
          userAddress={auth.address}
          privateKey={auth.privateKey}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            refreshDocuments();
          }}
        />
      )}

      {showShareModal && (
        <ShareModal address={auth.address} onClose={() => setShowShareModal(false)} />
      )}
    </main>
  );
}
