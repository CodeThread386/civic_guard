/**
 * Client-side local storage of document hashes.
 * Used in conjunction with blockchain storage for redundancy.
 */
const STORAGE_KEY = 'civicguard_doc_hashes';

export type StoredHash = {
  hash: string;
  documentType: string;
  verifierPubKeyHash: string;
  timestamp: number;
  metadata?: Record<string, string>;
};

export function getLocalHashes(): StoredHash[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addLocalHash(entry: StoredHash): void {
  const hashes = getLocalHashes();
  if (hashes.some((h) => h.hash === entry.hash)) return;
  hashes.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hashes));
}

export function getLocalDocumentTypes(): string[] {
  const hashes = getLocalHashes();
  const types = new Set<string>();
  hashes.forEach((h) => types.add(h.documentType));
  return Array.from(types);
}

const PROCESSED_REQUESTS_KEY = 'civicguard_processed_requests';

export function getProcessedRequestIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROCESSED_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function markRequestProcessed(requestId: string): void {
  const ids = getProcessedRequestIds();
  if (ids.includes(requestId)) return;
  ids.push(requestId);
  localStorage.setItem(PROCESSED_REQUESTS_KEY, JSON.stringify(ids));
}

/** Get metadata per document type (most recent entry per type). */
export function getMetadataByDocType(): Record<string, Record<string, string>> {
  const hashes = getLocalHashes();
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
