'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DOCUMENT_SCHEMAS } from '@/lib/document-types';
import { markRequestProcessed } from '@/lib/local-hashes';
import { processApprovedDocument } from '@/lib/process-approved-document';
import {
  getDefaultVerifierPubKeyHash,
  getVerifierDocumentTypes,
} from '@/lib/blockchain';

type Issuer = { pubKeyHash: string; name: string };

type Props = {
  userEmail: string;
  userAddress: string;
  privateKey: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function UploadDocumentModal({ userEmail, userAddress, privateKey, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'issuer' | 'type' | 'form' | 'pending' | 'processing'>('issuer');
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<Issuer | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadIssuers() {
      const list: Issuer[] = [];
      try {
        const defaultHash = await getDefaultVerifierPubKeyHash();
        list.push({ pubKeyHash: defaultHash, name: 'Default Issuer' });
      } catch (e) {
        console.error('Load default issuer error:', e);
      }
      try {
        const res = await fetch('/api/verifiers');
        const data = await res.json();
        if (data.verifiers?.length) {
          data.verifiers.forEach((v: { pubKeyHash: string; name: string }) => {
            if (!list.some((x) => x.pubKeyHash === v.pubKeyHash)) {
              list.push({ pubKeyHash: v.pubKeyHash, name: v.name });
            }
          });
        }
      } catch (e) {
        console.error('Load issuers error:', e);
      }
      if (list.length === 0) list.push({ pubKeyHash: '0x0', name: 'Default Issuer (Demo)' });
      setIssuers(list);
    }
    loadIssuers();
  }, []);

  useEffect(() => {
    if (!selectedIssuer) return;
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
            markRequestProcessed(requestId);
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
  }, [step, requestId]);

  const schema = selectedType ? DOCUMENT_SCHEMAS[selectedType] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Request Document</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 'issuer' && (
            <>
              <p className="text-slate-400">Select an issuer</p>
              <div className="space-y-2">
                {issuers.map((v) => (
                  <button
                    key={v.pubKeyHash}
                    onClick={() => {
                      setSelectedIssuer(v);
                      setStep('type');
                    }}
                    className="w-full py-3 px-4 bg-slate-700/50 hover:bg-teal-600/30 border border-slate-600 rounded-lg text-left text-white transition-colors"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </>
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
                    className="w-full py-3 px-4 bg-slate-700/50 hover:bg-teal-600/30 border border-slate-600 rounded-lg text-left text-white transition-colors"
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
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmitRequest}
                disabled={loading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg"
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
              <p className="text-teal-400">Processing your document...</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
