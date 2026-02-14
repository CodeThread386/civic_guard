'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getMetadataByDocType } from '@/lib/local-hashes';
import { getUserDocumentTypes } from '@/lib/blockchain';
import { ethers } from 'ethers';

type Props = {
  address: string;
  onClose: () => void;
};

export function ShareModal({ address, onClose }: Props) {
  const [shortId, setShortId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);

  const createShare = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Verification checks blockchain only. Share ONLY on-chain documents.
      const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(address));
      let chainTypes: string[] = [];
      try {
        chainTypes = await getUserDocumentTypes(pubKeyHash);
        if (!Array.isArray(chainTypes)) chainTypes = [];
      } catch (e) {
        setError('Could not reach blockchain. Ensure Hardhat node is running and you have completed registration.');
        setLoading(false);
        return;
      }
      if (chainTypes.length === 0) {
        setError('No documents on-chain yet. Complete blockchain registration, then request documents from an issuer. Documents must be recorded on-chain before sharing.');
        setLoading(false);
        return;
      }
      const metadata = getMetadataByDocType(address);
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, docTypes: chainTypes, metadata }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create share');
      setShortId(data.shortId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    createShare();
  }, [createShare]);

  const verifyUrl = typeof window !== 'undefined' && shortId
    ? `${window.location.origin}/v/${shortId}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-dark rounded-2xl border border-surface-border max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">qr_code_2</span>
            Share for Verification
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {shortId ? (
            <>
              <p className="text-slate-400 text-sm text-center">
                Show this QR to the verifier. Valid for 10 minutes.
              </p>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <QRCodeSVG value={verifyUrl} size={200} level="M" />
              </div>
              <p className="text-slate-500 text-xs text-center break-all">
                {verifyUrl}
              </p>
            </>
          ) : (
            <>
              {loading ? (
                <p className="text-slate-400 text-sm text-center">Generating QR...</p>
              ) : error ? (
                <div className="space-y-2">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={createShare}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
