'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getLocalDocumentTypes, getProcessedRequestIds, markRequestProcessed } from '@/lib/local-hashes';
import { processApprovedDocument } from '@/lib/process-approved-document';
import { Upload, LogOut, Share2 } from 'lucide-react';
import { UploadDocumentModal } from '@/components/UploadDocumentModal';
import { ShareModal } from '@/components/ShareModal';

export default function DashboardPage() {
  const router = useRouter();
  const { auth, authLoaded, logout } = useAuth();
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCount, setProcessingCount] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!authLoaded) return;
    if (!auth.isAuthenticated || auth.role === 'verifier') {
      router.push('/auth');
    }
  }, [authLoaded, auth.isAuthenticated, auth.role, router]);

  const refreshDocuments = useCallback(async () => {
    if (!auth.address || !auth.isAuthenticated) return;
    const localTypes = getLocalDocumentTypes();
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

  useEffect(() => {
    async function fetchAndProcessApproved() {
      if (!auth.address || !auth.isAuthenticated || !auth.privateKey) return;
      try {
        const res = await fetch(`/api/document-approved-for-user?address=${encodeURIComponent(auth.address)}`);
        const data = await res.json();
        if (!res.ok || !data.requests?.length) {
          await refreshDocuments();
          return;
        }
        const processed = getProcessedRequestIds();
        const toProcess = data.requests.filter((r: { id: string }) => !processed.includes(r.id));
        if (toProcess.length === 0) {
          await refreshDocuments();
          return;
        }
        setProcessingCount(toProcess.length);
        for (const req of toProcess) {
          try {
            if (!req.documentContent) {
              console.warn('Skipping approved doc with missing content:', req.id);
              markRequestProcessed(req.id);
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
            markRequestProcessed(req.id);
            await refreshDocuments();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('already recorded') || msg.includes('Document already recorded')) {
              markRequestProcessed(req.id);
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
    }
    fetchAndProcessApproved();
  }, [auth.address, auth.isAuthenticated, auth.privateKey, refreshDocuments]);

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
            onClick={() => setShowShareModal(true)}
            disabled={documentTypes.length === 0}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share for Verification
          </button>
        </div>

        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
          <h2 className="text-white font-medium mb-2">Your Documents</h2>
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
          onSuccess={() => setShowUploadModal(false)}
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
