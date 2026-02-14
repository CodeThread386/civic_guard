'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, CheckCircle, XCircle, AlertCircle, Upload } from 'lucide-react';
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
    // "Cannot stop, scanner is not running or paused" - ignore
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
      const docTypesParam =
        selectedDocs.size > 0 ? Array.from(selectedDocs).join(',') : '';
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
        className={`flex flex-col gap-1 p-3 rounded-lg ${failed ? 'bg-red-900/20 border border-red-800/50' : 'bg-slate-800/50'
          }`}
      >
        <div className="flex items-center gap-2">
          {onChain ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <span className="font-medium text-white">{docType}</span>
          {onChain ? (
            <span className="text-green-400 text-sm">On-chain verified</span>
          ) : (
            <span className="text-red-400 text-sm">Not found on-chain</span>
          )}
        </div>
        {r.ageCheck?.required && (
          <div className="ml-7 text-sm">
            {r.ageCheck.passed === true ? (
              <span className="text-green-400">
                Age 18+ verified {r.ageCheck.age != null && `(Age: ${r.ageCheck.age})`}
              </span>
            ) : r.ageCheck.passed === false ? (
              <span className="text-red-400">
                Age 18+ check failed {r.ageCheck.age != null && `(Age: ${r.ageCheck.age})`}
              </span>
            ) : (
              <span className="text-amber-400">DOB not available for age check</span>
            )}
          </div>
        )}
        {r.expiryCheck?.required && (
          <div className="ml-7 text-sm">
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900/10 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">CivicGuard Verifier</h1>
          <Link
            href="/"
            className="px-3 py-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-lg font-medium text-white mb-4">Required Documents</h2>
          <p className="text-slate-400 text-sm mb-4">
            Select the documents you need to verify. Each volunteer shares their own QR via &quot;Share for Verification&quot;.
            You can verify multiple users by scanning each person&apos;s QR—each scan verifies that specific user&apos;s documents only.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_DOC_TYPES.map((doc) => (
              <button
                key={doc}
                onClick={() => toggleDoc(doc)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedDocs.has(doc)
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600'
                  }`}
              >
                {selectedDocs.has(doc) && '✓ '}
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
                className="rounded border-slate-600 bg-slate-800 text-teal-500"
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
                className="rounded border-slate-600 bg-slate-800 text-teal-500"
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
              className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              <QrCode className="w-5 h-5" />
              {verifying ? 'Verifying...' : scanning ? 'Stop Scan' : 'Scan QR with Camera'}
            </button>
            <label className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
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
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}
          <div id="qr-reader-file" className="sr-only w-px h-px overflow-hidden" aria-hidden="true" />
          {scanning && (
            <div className="mt-4">
              <div id="qr-reader" className="w-full max-w-sm mx-auto rounded-xl overflow-hidden" />
            </div>
          )}

          {verifyResult && !scanning && (
            <div className="mt-6 p-6 bg-slate-800/80 rounded-xl border border-slate-700">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                {verifyResult.valid ? (
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
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Address: {verifyResult.address}
              </p>
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
