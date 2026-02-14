'use client';

import { useState, useRef } from 'react';

type Props = {
  request: {
    id: string;
    documentType: string;
    userEmail: string;
    formData: Record<string, string>;
  };
  onApprove: (file: File) => void;
  onReject: () => void;
  onClose: () => void;
  loading?: boolean;
};

export function RequestReviewModal({ request, onApprove, onReject, onClose, loading }: Props) {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApprove = () => {
    if (!documentFile) {
      alert('You must upload the verified document to approve. The volunteer will receive this document.');
      return;
    }
    onApprove(documentFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-dark rounded-2xl border border-surface-border max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="material-icons text-primary">rate_review</span>
            Review Request
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-slate-500 text-sm">Document Type</p>
            <p className="text-white font-medium">{request.documentType}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Requested by</p>
            <p className="text-white">{request.userEmail}</p>
          </div>
          {Object.keys(request.formData).length > 0 && (
            <div>
              <p className="text-slate-500 text-sm mb-2">Submitted Details (for your verification)</p>
              <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                {Object.entries(request.formData).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-slate-400 text-sm">{key}</span>
                    <span className="text-white text-sm text-right break-all">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-slate-500 text-sm mb-2">Upload verified document (required to approve)</p>
            <p className="text-slate-400 text-xs mb-2">
              Upload the verified document file. This will be sent to the volunteer for hashing. PDF or image.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400"
            />
            {documentFile && <p className="text-primary text-sm mt-1 flex items-center gap-1"><span className="material-icons text-sm">check_circle</span>{documentFile.name}</p>}
          </div>
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleApprove}
              disabled={loading || !documentFile}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Approving...' : 'Approve & Send Document'}
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 py-3 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-lg"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
