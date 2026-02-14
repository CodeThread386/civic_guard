'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getLocalDocumentTypes, getProcessedRequestIds, markRequestProcessed } from '@/lib/local-hashes';
import { processApprovedDocument } from '@/lib/process-approved-document';
import { Upload, LogOut, Share2 } from 'lucide-react';
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
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900 flex items-center justify-center">
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
    // Check if documents exist
    if (documentTypes.length === 0) {
      return; // Button is disabled anyway, but double-check
    }

    // Check WebAuthn support
    if (!isWebAuthnSupported()) {
      const proceed = window.confirm(
        'Biometric authentication is not supported on this browser/device. ' +
        'Your QR code will be shown without additional verification. Continue?'
      );
      if (proceed) {
        setShowShareModal(true);
      }
      return;
    }

    // Perform biometric verification
    setVerifyingBiometric(true);
    try {
      await verifyLocalDevice();
      // Verification successful - show modal
      setShowShareModal(true);
    } catch (error) {
      // Verification failed or cancelled
      const message = error instanceof Error
        ? error.message
        : 'Biometric verification failed';
      alert(message);
    } finally {
      setVerifyingBiometric(false);
    }
  };

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress || contractAddress.trim() === '') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md p-6 bg-slate-800 rounded-xl border border-amber-600/50">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Blockchain not configured</h2>
          <p className="text-slate-400 text-sm mb-4">
            Run <code className="bg-slate-700 px-2 py-1 rounded">npm run setup-demo</code> with Hardhat node running first.
          </p>
          <p className="text-slate-500 text-xs">
            Terminal 1: <code className="bg-slate-700 px-2 py-1 rounded">npx hardhat node</code><br />
            Terminal 2: <code className="bg-slate-700 px-2 py-1 rounded">npm run setup-demo</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">CivicGuard</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{auth.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {auth.blockchainPending && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
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

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
          >
            <Upload className="w-5 h-5" />
            Request Document
          </button>
          <button
            onClick={handleShareClick}
            disabled={documentTypes.length === 0 || verifyingBiometric}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
            {verifyingBiometric ? 'Verifying...' : 'Share for Verification'}
          </button>
        </div>

        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-medium">Your Documents</h2>
            <button
              onClick={() => { setLoading(true); refreshDocuments(); }}
              className="text-sm text-teal-400 hover:text-teal-300"
            >
              Refresh
            </button>
          </div>
          {loading && processingCount === 0 ? (
            <p className="text-slate-500">Loading...</p>
          ) : processingCount > 0 ? (
            <p className="text-teal-400">Processing {processingCount} new document(s)...</p>
          ) : documentTypes.length === 0 ? (
            <p className="text-slate-500">
              No documents yet. Request a document from an issuer to get started.
            </p>
          ) : (
            <p className="text-slate-400">
              {documentTypes.join(', ')}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-2">
            Tap &quot;Share for Verification&quot; to create a time-limited QR for verifiers.
          </p>
        </div>
      </div>

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
        <ShareModal
          address={auth.address}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}
