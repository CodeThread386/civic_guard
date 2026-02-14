/**
 * Document requests with file persistence.
 */
import { readJson, writeJson } from './storage';

export type DocumentRequest = {
  id: string;
  userEmail: string;
  userAddress: string;
  verifierPubKeyHash: string;
  documentType: string;
  formData: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  documentContent?: string;
};

const FILENAME = 'document-requests.json';

async function load(): Promise<Record<string, DocumentRequest>> {
  const data = await readJson<Record<string, DocumentRequest>>(FILENAME);
  return data || {};
}

async function save(data: Record<string, DocumentRequest>): Promise<void> {
  await writeJson(FILENAME, data);
}

export async function createRequest(
  userEmail: string,
  userAddress: string,
  verifierPubKeyHash: string,
  documentType: string,
  formData: Record<string, string>
): Promise<string> {
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const data = await load();
  data[id] = {
    id,
    userEmail,
    userAddress,
    verifierPubKeyHash,
    documentType,
    formData,
    status: 'pending',
    createdAt: Date.now(),
  };
  await save(data);
  return id;
}

export async function getRequest(id: string): Promise<DocumentRequest | undefined> {
  const data = await load();
  return data[id];
}

export async function approveRequest(id: string, documentContent: string): Promise<boolean> {
  const data = await load();
  const req = data[id];
  if (!req || req.status !== 'pending') return false;
  req.status = 'approved';
  req.documentContent = documentContent;
  await save(data);
  return true;
}

export async function rejectRequest(id: string): Promise<boolean> {
  const data = await load();
  const req = data[id];
  if (!req || req.status !== 'pending') return false;
  req.status = 'rejected';
  await save(data);
  return true;
}

export async function getPendingForVerifier(verifierPubKeyHash: string): Promise<DocumentRequest[]> {
  const data = await load();
  return Object.values(data).filter(
    (r) => r.verifierPubKeyHash === verifierPubKeyHash && r.status === 'pending'
  );
}

function addressesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

export async function getApprovedForUser(userAddress: string): Promise<DocumentRequest[]> {
  const data = await load();
  const normalized = (userAddress || '').toLowerCase().trim();
  if (!normalized) return [];
  return Object.values(data).filter(
    (r) =>
      r.status === 'approved' &&
      r.documentContent &&
      addressesMatch(r.userAddress, userAddress)
  );
}
