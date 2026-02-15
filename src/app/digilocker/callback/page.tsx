'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * DigiLocker OAuth callback page.
 * Receives redirect from DigiLocker with success, id, scope.
 * Communicates result to opener window (popup flow).
 */
export default function DigiLockerCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing');

  useEffect(() => {
    const success = searchParams.get('success');
    const id = searchParams.get('id');
    const scope = searchParams.get('scope') || '';
    const errCode = searchParams.get('errCode');
    const errMessage = searchParams.get('errMessage');

    if (window.opener) {
      if (success === 'True' || success === 'true') {
        window.opener.postMessage(
          { type: 'digilocker-callback', success: true, id: id || '', scope },
          window.location.origin
        );
      } else {
        window.opener.postMessage(
          {
            type: 'digilocker-callback',
            success: false,
            error: errMessage || errCode || 'User denied or consent failed',
          },
          window.location.origin
        );
      }
      setStatus('done');
      setTimeout(() => window.close(), 500);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Completing DigiLocker authorization...</p>
          </>
        )}
        {status === 'done' && (
          <p className="text-teal-400">Authorization complete. You can close this window.</p>
        )}
        {status === 'error' && (
          <p className="text-red-400">This page should be opened as a popup. Please try again from the app.</p>
        )}
      </div>
    </div>
  );
}
