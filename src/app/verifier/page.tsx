'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { extractShortIdFromQR, getVerifyApiBaseFromQR } from '@/lib/qr-payload';
import Link from 'next/link';
import type { VerifyResult, VerifyDocResult } from '@/types/verify';

const ALL_DOC_TYPES = ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'];

function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext;
}

function safeStopScanner(scanner: Html5Qrcode | null): void {
  if (!scanner) return;
  try {
    scanner.stop().catch(() => { });
  } catch {
    // ignore
  }
}

export default function VerifierPage() {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [requireAge18, setRequireAge18] = useState(false);
  const [requireNotExpired, setRequireNotExpired] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanningFile, setScanningFile] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleDoc = (doc: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
    setVerifyResult(null);
    setVerifyError(null);
  };

  const verifyWithShortId = useCallback(async (shortId: string, apiBase?: string) => {
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const docTypesParam = selectedDocs.size > 0 ? Array.from(selectedDocs).join(',') : '';
      const params = new URLSearchParams();
      if (docTypesParam) params.set('docTypes', docTypesParam);
      if (requireAge18) params.set('age18', 'true');
      if (requireNotExpired) params.set('notExpired', 'true');
      const base = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
      const url = `${base}/api/verify/${shortId}?${params.toString()}`;
      const res = await fetch(url);
      let data: VerifyResult;
      try {
        data = await res.json();
      } catch {
        throw new Error('Invalid response from server');
      }
      if (!res.ok) {
        throw new Error(data?.error || 'Verification failed');
      }
      setVerifyResult({
        valid: data.valid ?? false,
        address: data.address ?? '',
        docTypes: Array.isArray(data.docTypes) ? data.docTypes : [],
        results: Array.isArray(data.results) ? data.results : [],
      });
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [selectedDocs, requireAge18, requireNotExpired]);

  const startScan = async () => {
    if (selectedDocs.size === 0) {
      alert('Select at least one document type to verify');
      return;
    }
    if (!isSecureContext()) {
      setVerifyError('Camera requires HTTPS or localhost. Please use a secure connection.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVerifyError('Camera not supported. Use "Upload QR Image" to scan from a screenshot.');
      return;
    }
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setVerifyError('Camera permission denied. Please allow camera access in your browser and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setVerifyError('No camera found. Please connect a camera and try again.');
      } else {
        setVerifyError('Could not access camera. Please allow camera permissions and try again.');
      }
      return;
    }
    setScanning(true);
  };

  const stopScan = () => {
    safeStopScanner(scannerRef.current);
    scannerRef.current = null;
    setScanning(false);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedDocs.size === 0) return;
    e.target.value = '';
    setScanningFile(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const html5Qr = new Html5Qrcode('qr-reader-file', false);
      const decodedText = await html5Qr.scanFile(file, false);
      const shortId = extractShortIdFromQR(decodedText);
      if (shortId) {
        const apiBase = getVerifyApiBaseFromQR(decodedText);
        await verifyWithShortId(shortId, apiBase);
      } else {
        setVerifyError('Invalid QR. Volunteer must use "Share for Verification" to generate a valid QR.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      setVerifyError('Could not read QR from image. Ensure it is a clear QR code.');
    } finally {
      setScanningFile(false);
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let mounted = true;
    let html5Qr: Html5Qrcode | null = null;

    const run = async () => {
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      if (!mounted) return;

      const el = document.getElementById('qr-reader');
      if (!el) {
        setVerifyError('Scanner element not ready. Please try again.');
        setScanning(false);
        return;
      }

      const onScanSuccess = (decodedText: string) => {
        if (!mounted) return;
        safeStopScanner(html5Qr);
        setScanning(false);
        try {
          const shortId = extractShortIdFromQR(decodedText);
          if (shortId) {
            const apiBase = getVerifyApiBaseFromQR(decodedText);
            verifyWithShortId(shortId, apiBase);
          } else {
            setVerifyError('Invalid QR. Volunteer must use "Share for Verification" to generate a valid QR.');
          }
        } catch (e) {
          console.error('QR scan callback error:', e);
          setVerifyError(e instanceof Error ? e.message : 'Verification failed');
        }
      };

      try {
        html5Qr = new Html5Qrcode('qr-reader', false);
        scannerRef.current = html5Qr;
        const constraints = { facingMode: 'user' as const };
        const scanConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        await html5Qr.start(constraints, scanConfig, onScanSuccess, () => { });
      } catch (e) {
        if (mounted) {
          console.error('Scan error:', e);
          setScanning(false);
          const msg = e instanceof Error ? e.message : String(e);
          setVerifyError(msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')
            ? 'Camera permission denied. Please allow camera access in your browser and try again.'
            : 'Could not access camera. Please allow camera permissions and try again.');
        }
      }
    };
    run();

    return () => {
      mounted = false;
      scannerRef.current = null;
      safeStopScanner(html5Qr);
    };
  }, [scanning, verifyWithShortId]);

  const renderDocResult = (r: VerifyDocResult, index: number) => {
    if (!r || typeof r !== 'object') return null;
    const docType = r.documentType ?? `Document ${index + 1}`;
    const onChain = Boolean(r.onChain);
    const failed = !onChain || r.ageCheck?.passed === false || r.expiryCheck?.passed === false;
    return (
      <div
        key={docType}
        className={`flex flex-col gap-1 p-3 rounded-lg ${failed ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-800/50 border border-slate-700'}`}
      >
        <div className="flex items-center gap-2">
          {onChain ? (
            <span className="material-icons text-green-400 text-lg">check_circle</span>
          ) : (
            <span className="material-icons text-red-400 text-lg">cancel</span>
          )}
          <span className="font-medium text-white">{docType}</span>
          {onChain ? (
            <span className="text-green-400 text-sm">On-chain verified</span>
          ) : (
            <span className="text-red-400 text-sm">Not found on-chain</span>
          )}
        </div>
        {r.ageCheck?.required && (
          <div className="ml-8 text-sm">
            {r.ageCheck.passed === true ? (
              <span className="text-green-400">Age 18+ verified {r.ageCheck.age != null && `(Age: ${r.ageCheck.age})`}</span>
            ) : r.ageCheck.passed === false ? (
              <span className="text-red-400">Age 18+ check failed {r.ageCheck.age != null && `(Age: ${r.ageCheck.age})`}</span>
            ) : (
              <span className="text-amber-400">DOB not available for age check</span>
            )}
          </div>
        )}
        {r.expiryCheck?.required && (
          <div className="ml-8 text-sm">
            {r.expiryCheck.passed === true ? (
              <span className="text-green-400">Document not expired</span>
            ) : r.expiryCheck.passed === false ? (
              <span className="text-red-400">Document expired</span>
            ) : (
              <span className="text-amber-400">Expiry not available for check</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background-dark font-display text-slate-200 flex flex-col">
      <header className="h-16 border-b border-slate-800 bg-surface-dark flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <span className="material-icons">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
              <span className="material-icons text-sm">shield</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">CivicGuard</h1>
              <p className="text-xs text-slate-500 font-medium">Verifier Command Center</p>
            </div>
          </div>
          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">ONLINE - SECURE</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 py-1.5 px-3 rounded-lg border border-slate-700">
          <span className="material-icons text-primary text-sm">qr_code_scanner</span>
          <span className="text-sm font-semibold text-slate-300">Verifier Mode</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 w-full flex-1">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Required Documents</h2>
          <p className="text-slate-500 text-sm mb-6">
            Select the documents you need to verify. Each volunteer shares their own QR via &quot;Share for Verification&quot;.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_DOC_TYPES.map((doc) => (
              <button
                key={doc}
                onClick={() => toggleDoc(doc)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedDocs.has(doc)
                  ? 'bg-primary text-white border border-primary'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-slate-700'
                  }`}
              >
                {selectedDocs.has(doc) && <span className="material-icons text-sm align-middle mr-1">check</span>}
                {doc}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAge18}
                onChange={(e) => {
                  setRequireAge18(e.target.checked);
                  setVerifyResult(null);
                }}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-slate-300 text-sm">Require age 18+</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireNotExpired}
                onChange={(e) => {
                  setRequireNotExpired(e.target.checked);
                  setVerifyResult(null);
                }}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-slate-300 text-sm">Require document not expired</span>
            </label>
          </div>
        </section>

        <section className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={scanning ? stopScan : startScan}
              disabled={verifying || scanningFile}
              className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-icons">qr_code_scanner</span>
              {verifying ? 'Verifying...' : scanning ? 'Stop Scan' : 'Scan QR with Camera'}
            </button>
            <label className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors cursor-pointer border border-slate-700">
              <span className="material-icons">upload_file</span>
              {scanningFile ? 'Scanning...' : 'Upload QR Image'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                disabled={verifying || scanningFile || selectedDocs.size === 0}
                className="hidden"
              />
            </label>
          </div>
          {verifyError && (
            <div className="mt-4 flex items-center gap-2 p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400">
              <span className="material-icons">error</span>
              <span>{verifyError}</span>
            </div>
          )}
          <div id="qr-reader-file" className="sr-only w-px h-px overflow-hidden" aria-hidden="true" />
          {scanning && (
            <div className="mt-6">
              <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border-4 border-primary shadow-[0_0_15px_rgba(36,99,235,0.5)]">
                <div id="qr-reader" className="w-full" />
              </div>
              <p className="text-center text-white font-semibold mt-4">Align QR code within frame</p>
              <p className="text-center text-slate-400 text-sm mt-1">Make sure lighting is adequate</p>
            </div>
          )}

          {verifyResult && !scanning && (
            <div className="mt-6 p-6 bg-surface-dark rounded-xl border border-slate-800">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                {verifyResult.valid ? (
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
              </h3>
              <p className="text-slate-500 text-sm mb-4">Address: {verifyResult.address}</p>
              <div className="space-y-2">
                {(verifyResult.results || []).map((r, i) => renderDocResult(r, i))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
