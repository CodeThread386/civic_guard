/**
 * Client-side local storage of document hashes.
 * Used in conjunction with blockchain storage for redundancy.
 *
 * CRITICAL: All data is scoped by user address to prevent cross-user data leakage.
 * User A's documents (e.g. Aadhar) must NEVER be visible to User B on the same device.
 * Keys: civicguard_doc_hashes_${address}, civicguard_processed_requests_${address}
 */
const STORAGE_KEY_PREFIX = 'civicguard_doc_hashes_';
const PROCESSED_REQUESTS_KEY_PREFIX = 'civicguard_processed_requests_';

function normalizeAddress(addr: string): string {
  return (addr || '').toLowerCase().trim();
}

/** Guard: never use without a valid user address to prevent cross-user leakage */
function requireAddress(addr: string): void {
  if (!addr || typeof addr !== 'string' || addr.trim().length < 10) {
    throw new Error('User address required for document storage access');
  }
}

function getHashesKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}${normalizeAddress(address)}`;
}

function getProcessedKey(address: string): string {
  return `${PROCESSED_REQUESTS_KEY_PREFIX}${normalizeAddress(address)}`;
}

export type StoredHash = {
  hash: string;
  documentType: string;
  verifierPubKeyHash: string;
  timestamp: number;
  metadata?: Record<string, string>;
};

export function getLocalHashes(userAddress: string): StoredHash[] {
  if (typeof window === 'undefined') return [];
  if (!userAddress) return [];
  requireAddress(userAddress);
  try {
    const raw = localStorage.getItem(getHashesKey(userAddress));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addLocalHash(entry: StoredHash, userAddress: string): void {
  if (!userAddress) return;
  requireAddress(userAddress);
  const hashes = getLocalHashes(userAddress);
  if (hashes.some((h) => h.hash === entry.hash)) return;
  hashes.push(entry);
  localStorage.setItem(getHashesKey(userAddress), JSON.stringify(hashes));
}

export function getLocalDocumentTypes(userAddress: string): string[] {
  const hashes = getLocalHashes(userAddress);
  const types = new Set<string>();
  hashes.forEach((h) => types.add(h.documentType));
  return Array.from(types);
}

export function getProcessedRequestIds(userAddress: string): string[] {
  if (typeof window === 'undefined') return [];
  if (!userAddress) return [];
  requireAddress(userAddress);
  try {
    const raw = localStorage.getItem(getProcessedKey(userAddress));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function markRequestProcessed(requestId: string, userAddress: string): void {
  if (!userAddress) return;
  requireAddress(userAddress);
  const ids = getProcessedRequestIds(userAddress);
  if (ids.includes(requestId)) return;
  ids.push(requestId);
  localStorage.setItem(getProcessedKey(userAddress), JSON.stringify(ids));
}

/** Get metadata per document type (most recent entry per type). */
export function getMetadataByDocType(userAddress: string): Record<string, Record<string, string>> {
  if (!userAddress) return {};
  requireAddress(userAddress);
  const hashes = getLocalHashes(userAddress);
  const byType: Record<string, { meta: Record<string, string>; ts: number }> = {};
  for (const h of hashes) {
    if (!h.metadata || Object.keys(h.metadata).length === 0) continue;
    const existing = byType[h.documentType];
    if (!existing || h.timestamp > existing.ts) {
      byType[h.documentType] = { meta: h.metadata, ts: h.timestamp };
    }
  }
  const result: Record<string, Record<string, string>> = {};
  for (const [dt, { meta }] of Object.entries(byType)) {
    result[dt] = meta;
  }
  return result;
}
