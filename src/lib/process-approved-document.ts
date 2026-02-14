/**
 * Process an approved document: hash, add to localStorage, record on chain.
 * Used by UploadDocumentModal (when modal is open during approval) and
 * Dashboard (when loading approved docs that were approved while volunteer was away).
 */
import { ethers } from 'ethers';
import { hashDocument } from '@/lib/crypto';
import { addLocalHash } from '@/lib/local-hashes';
import { extractMetadata } from '@/lib/document-metadata';
import { recordDocumentOnChain } from '@/lib/blockchain';

export type ApprovedRequestData = {
  id: string;
  documentContent: string;
  documentType: string;
  verifierPubKeyHash: string;
  formData: Record<string, string>;
};

export async function processApprovedDocument(
  data: ApprovedRequestData,
  privateKey: string
): Promise<void> {
  const { documentContent } = data;
  if (!documentContent || typeof documentContent !== 'string') {
    throw new Error('Document content is required');
  }
  let blob: Blob;
  if (documentContent.startsWith('{') || documentContent.startsWith('[')) {
    blob = new Blob([documentContent], { type: 'application/json' });
  } else {
    const binary = atob(documentContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    blob = new Blob([bytes]);
  }

  const docHash = await hashDocument(blob);
  const metadata = data.documentType
    ? extractMetadata(data.documentType, data.formData || {})
    : {};

  const wallet = new ethers.Wallet(privateKey);
  const userAddress = wallet.address;

  addLocalHash(
    {
      hash: docHash,
      documentType: data.documentType,
      verifierPubKeyHash: data.verifierPubKeyHash,
      timestamp: Date.now(),
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    },
    userAddress
  );

  await recordDocumentOnChain(
    privateKey,
    docHash,
    data.verifierPubKeyHash,
    data.documentType
  );
}
