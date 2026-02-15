'use client';

import { useState, useEffect, useCallback } from 'react';
import { DOCUMENT_SCHEMAS } from '@/lib/document-types';
import { markRequestProcessed } from '@/lib/local-hashes';
import { processApprovedDocument } from '@/lib/process-approved-document';
import {
  getDefaultVerifierPubKeyHash,
  getVerifierDocumentTypes,
} from '@/lib/blockchain';
import { getDigiLockerPubKeyHash, DIGILOCKER_SCOPE_TO_DOCTYPE } from '@/lib/digilocker';

type Issuer = { pubKeyHash: string; name: string; isDigiLocker?: boolean };

type Props = {
  userEmail: string;
  userAddress: string;
  privateKey: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function UploadDocumentModal({ userEmail, userAddress, privateKey, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<
    | 'issuer'
    | 'type'
    | 'form'
    | 'pending'
    | 'processing'
    | 'digilocker_connect'
    | 'digilocker_select'
    | 'digilocker_processing'
  >('issuer');
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<Issuer | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // DigiLocker state
  const [digilockerSessionId, setDigilockerSessionId] = useState<string | null>(null);
  const [digilockerDocTypes, setDigilockerDocTypes] = useState<string[]>([]);
  const [digilockerSelected, setDigilockerSelected] = useState<Record<string, boolean>>({});
  const [digilockerProcessingIndex, setDigilockerProcessingIndex] = useState(0);
  const [digilockerProcessingTotal, setDigilockerProcessingTotal] = useState(0);

  const digilockerPubKeyHash = getDigiLockerPubKeyHash();

  useEffect(() => {
    async function loadIssuers() {
      const list: Issuer[] = [];
      try {
        const res = await fetch('/api/verifiers');
        const data = await res.json();
        if (data.verifiers?.length) {
          data.verifiers.forEach((v: { pubKeyHash: string; name: string }) => {
            if (v.pubKeyHash && !list.some((x) => x.pubKeyHash === v.pubKeyHash)) {
              list.push({ pubKeyHash: v.pubKeyHash, name: v.name || 'Issuer' });
            }
          });
        }
      } catch (e) {
        console.error('Load issuers error:', e);
      }
      if (list.length === 0) {
        try {
          const defaultHash = await getDefaultVerifierPubKeyHash();
          list.push({ pubKeyHash: defaultHash, name: 'CivicGuard Issuer' });
        } catch (e) {
          list.push({ pubKeyHash: '0x0', name: 'CivicGuard Issuer' });
        }
      }
      if (!list.some((x) => x.pubKeyHash === digilockerPubKeyHash || x.name === 'DigiLocker')) {
        list.push({ pubKeyHash: digilockerPubKeyHash, name: 'DigiLocker', isDigiLocker: true });
      }
      setIssuers(list);
    }
    loadIssuers();
  }, [digilockerPubKeyHash]);

  useEffect(() => {
    if (!selectedIssuer || selectedIssuer.isDigiLocker) return;
    const v = selectedIssuer;
    const defaultTypes = ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'];
    async function loadTypes() {
      try {
        const types = await getVerifierDocumentTypes(v.pubKeyHash);
        const fromContract = Array.isArray(types) && types.length > 0 ? types : null;
        if (fromContract) {
          setDocTypes(fromContract);
          return;
        }
        const res = await fetch('/api/verifiers');
        const data = await res.json();
        const issuer = data.verifiers?.find((x: { pubKeyHash: string }) => x.pubKeyHash === v.pubKeyHash);
        setDocTypes(issuer?.documentTypes || defaultTypes);
      } catch (e) {
        setDocTypes(defaultTypes);
      }
    }
    loadTypes();
  }, [selectedIssuer]);

  const handleDigiLockerConnect = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const redirectUrl = `${window.location.origin}/digilocker/callback`;
      const res = await fetch('/api/digilocker/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to init DigiLocker');
      const url = data.url;
      const id = data.id;
      const popup = window.open(url, 'digilocker', 'width=500,height=600');
      const handleMessage = (e: MessageEvent) => {
        if (e.origin !== window.location.origin || e.data?.type !== 'digilocker-callback') return;
        window.removeEventListener('message', handleMessage);
        setLoading(false);
        if (e.data.success) {
          setDigilockerSessionId(e.data.id || id);
          const scopeParts = (e.data.scope || '').split(/[+&]/).filter(Boolean);
          const types = scopeParts
            .map((s: string) => DIGILOCKER_SCOPE_TO_DOCTYPE[s] || s)
            .filter(Boolean);
          setDigilockerDocTypes(types.length > 0 ? types : ['Aadhar', 'PAN', 'Driving License']);
          setDigilockerSelected(
            Object.fromEntries(
              (types.length > 0 ? types : ['Aadhar', 'PAN', 'Driving License']).map((t: string) => [t, false])
            )
          );
          setStep('digilocker_select');
        } else {
          setError(e.data.error || 'DigiLocker authorization failed');
        }
        popup?.close();
      };
      window.addEventListener('message', handleMessage);
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect DigiLocker');
      setLoading(false);
    }
  }, []);

  const handleDigiLockerAddSelected = useCallback(async () => {
    const selected = Object.entries(digilockerSelected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selected.length === 0) {
      setError('Select at least one document');
      return;
    }
    if (!digilockerSessionId) {
      setError('No DigiLocker session');
      return;
    }
    setError('');
    setStep('digilocker_processing');
    setDigilockerProcessingTotal(selected.length);
    setDigilockerProcessingIndex(0);

    for (let i = 0; i < selected.length; i++) {
      setDigilockerProcessingIndex(i + 1);
      const docType = selected[i];
      try {
        let documentContent: string;
        let formData: Record<string, string> = {};

        if (docType === 'Aadhar') {
          const res = await fetch('/api/digilocker/fetch-aadhaar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: digilockerSessionId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch Aadhaar');
          documentContent = data.documentContent;
          formData = data.formData || {};
        } else {
          const res = await fetch('/api/digilocker/fetch-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: digilockerSessionId,
              docType,
              format: 'pdf',
              parameters: [],
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch document');
          documentContent = data.documentContent;
          formData = data.formData || {};
        }

        await processApprovedDocument(
          {
            id: `digilocker-${docType}-${Date.now()}`,
            documentContent,
            documentType: docType,
            verifierPubKeyHash: digilockerPubKeyHash,
            formData,
          },
          privateKey
        );
      } catch (e) {
        setError(`Failed to add ${docType}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        setStep('digilocker_select');
        return;
      }
    }
    onSuccess();
    onClose();
  }, [digilockerSessionId, digilockerSelected, digilockerPubKeyHash, privateKey, onSuccess, onClose]);

  const handleSubmitRequest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/document-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          userAddress,
          verifierPubKeyHash: selectedIssuer!.pubKeyHash,
          documentType: selectedType,
          formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create request');
      setRequestId(data.requestId);
      setStep('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'pending' || !requestId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/document-status/${requestId}`);
        const data = await res.json();
        if (data.status === 'approved' && data.documentContent) {
          setStep('processing');
          clearInterval(interval);
          try {
            await processApprovedDocument(
              {
                id: requestId,
                documentContent: data.documentContent,
                documentType: data.documentType || selectedType!,
                verifierPubKeyHash: selectedIssuer!.pubKeyHash,
                formData: data.formData || {},
              },
              privateKey
            );
            markRequestProcessed(requestId, userAddress);
            onSuccess();
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to process document');
          }
        } else if (data.status === 'rejected') {
          setError('Request was rejected by issuer');
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, requestId, selectedIssuer, selectedType, privateKey, userAddress, onSuccess, onClose]);

  const schema = selectedType ? DOCUMENT_SCHEMAS[selectedType] : [];

  const handleIssuerSelect = (issuer: Issuer) => {
    setSelectedIssuer(issuer);
    if (issuer.isDigiLocker) {
      setStep('digilocker_connect');
    } else {
      setStep('type');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-dark rounded-2xl border border-surface-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">add_moderator</span>
            Request Document
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 'issuer' && (
            <>
              <p className="text-slate-400">Select an issuer</p>
              <div className="space-y-2">
                {issuers.map((v) => (
                  <button
                    key={v.pubKeyHash}
                    onClick={() => handleIssuerSelect(v)}
                    className="w-full py-3 px-4 bg-slate-800/50 hover:bg-primary/20 border border-surface-border hover:border-primary/50 rounded-lg text-left text-white transition-colors flex items-center gap-2"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'digilocker_connect' && (
            <>
              <button onClick={() => { setStep('issuer'); setSelectedIssuer(null); }} className="text-slate-500 text-sm">
                ← Back
              </button>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📄</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Connect DigiLocker</h3>
                <p className="text-slate-400 text-sm mb-6">
                  You will be redirected to DigiLocker to sign in and authorize access to your documents.
                  Select the documents you want to add to CivicGuard.
                </p>
                <button
                  onClick={handleDigiLockerConnect}
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Connecting...' : 'Connect to DigiLocker'}
                </button>
              </div>
            </>
          )}

          {step === 'digilocker_select' && (
            <>
              <button onClick={() => { setStep('digilocker_connect'); setDigilockerSessionId(null); }} className="text-slate-500 text-sm">
                ← Back
              </button>
              <p className="text-slate-400">We found these documents in your DigiLocker. Select the ones you want to add to CivicGuard:</p>
              <div className="space-y-2">
                {digilockerDocTypes.map((docType) => (
                  <label
                    key={docType}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 border border-surface-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={digilockerSelected[docType] || false}
                      onChange={(e) =>
                        setDigilockerSelected((s) => ({ ...s, [docType]: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-white">{docType}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleDigiLockerAddSelected}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors"
              >
                Add Selected to CivicGuard
              </button>
            </>
          )}

          {step === 'digilocker_processing' && (
            <div className="text-center py-8">
              <p className="text-teal-400 flex items-center justify-center gap-2">
                <span className="material-icons animate-spin">refresh</span>
                Adding documents... ({digilockerProcessingIndex} of {digilockerProcessingTotal})
              </p>
            </div>
          )}

          {step === 'type' && (
            <>
              <button onClick={() => setStep('issuer')} className="text-slate-500 text-sm">
                ← Back
              </button>
              <p className="text-slate-400">Select document type</p>
              <div className="space-y-2">
                {docTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedType(t);
                      setFormData({});
                      setStep('form');
                    }}
                    className="w-full py-3 px-4 bg-slate-800/50 hover:bg-primary/20 border border-surface-border hover:border-primary/50 rounded-lg text-left text-white transition-colors flex items-center gap-2"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'form' && (
            <>
              <button onClick={() => setStep('type')} className="text-slate-500 text-sm">
                ← Back
              </button>
              <p className="text-slate-400">Fill in your details for the issuer to verify</p>
              <div className="space-y-3">
                {schema.map(({ label, type }) => (
                  <div key={label}>
                    <label className="block text-sm text-slate-500 mb-1">{label}</label>
                    <input
                      type={type}
                      value={formData[label] || ''}
                      onChange={(e) => setFormData((d) => ({ ...d, [label]: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-surface-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmitRequest}
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-primary/30"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </>
          )}

          {step === 'pending' && (
            <div className="text-center py-8">
              <p className="text-slate-400">Request sent to issuer. Waiting for approval...</p>
              <p className="text-slate-500 text-sm mt-2">The issuer will verify and send you the document.</p>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <p className="text-primary flex items-center justify-center gap-2">
                <span className="material-icons animate-spin">refresh</span>
                Processing your document...
              </p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
