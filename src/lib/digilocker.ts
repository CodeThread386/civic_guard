/**
 * DigiLocker API client (Setu / API Setu compatible).
 * Requires: DIGILOCKER_API_BASE_URL, DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID
 */

import { ethers } from 'ethers';

const BASE_URL = process.env.DIGILOCKER_API_BASE_URL || 'https://api.setu.co';
const CLIENT_ID = process.env.DIGILOCKER_CLIENT_ID || process.env.NEXT_PUBLIC_DIGILOCKER_CLIENT_ID;
const CLIENT_SECRET = process.env.DIGILOCKER_CLIENT_SECRET;
const PRODUCT_INSTANCE_ID = process.env.DIGILOCKER_PRODUCT_INSTANCE_ID;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (CLIENT_ID) headers['x-client-id'] = CLIENT_ID;
  if (CLIENT_SECRET) headers['x-client-secret'] = CLIENT_SECRET;
  if (PRODUCT_INSTANCE_ID) headers['x-product-instance-id'] = PRODUCT_INSTANCE_ID;
  return headers;
}

export function isDigiLockerConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && PRODUCT_INSTANCE_ID);
}

export type DigiLockerInitResponse = {
  id: string;
  status: 'unauthenticated' | 'authenticated' | 'revoked';
  url: string;
  validUpto: string;
};

export async function initDigiLockerSession(redirectUrl: string): Promise<DigiLockerInitResponse> {
  if (!isDigiLockerConfigured()) {
    throw new Error('DigiLocker is not configured. Add DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID to .env.local');
  }
  const res = await fetch(`${BASE_URL}/api/digilocker`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ redirectUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to init DigiLocker session');
  return data;
}

export type DigiLockerStatusResponse = {
  id: string;
  status: 'unauthenticated' | 'authenticated' | 'revoked';
  url: string;
  validUpto: string;
  digilockerUserDetails?: {
    digilockerId?: string;
    email?: string;
    phoneNumber?: string;
  };
};

export async function getDigiLockerStatus(id: string): Promise<DigiLockerStatusResponse> {
  if (!isDigiLockerConfigured()) {
    throw new Error('DigiLocker is not configured');
  }
  const res = await fetch(`${BASE_URL}/api/digilocker/${id}/status`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to get status');
  return data;
}

export type DigiLockerDocument = {
  docType: string;
  orgId: string;
  orgName: string;
  description: string;
  availableFormats: string[];
  parameters?: { name: string; description: string }[];
};

export type DigiLockerDocumentsResponse = {
  documents: DigiLockerDocument[];
};

export async function getDigiLockerDocumentsList(): Promise<DigiLockerDocumentsResponse> {
  if (!isDigiLockerConfigured()) {
    throw new Error('DigiLocker is not configured');
  }
  const res = await fetch(`${BASE_URL}/api/digilocker/documents`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to get documents list');
  return data;
}

export type DigiLockerAadhaarResponse = {
  aadhaar: {
    dateOfBirth?: string;
    name?: string;
    address?: Record<string, string>;
    maskedNumber?: string;
    xml?: { fileUrl: string; validUntil: string };
  };
  status: string;
};

export async function fetchDigiLockerAadhaar(id: string): Promise<{ fileUrl: string; aadhaarData: DigiLockerAadhaarResponse }> {
  if (!isDigiLockerConfigured()) {
    throw new Error('DigiLocker is not configured');
  }
  const res = await fetch(`${BASE_URL}/api/digilocker/${id}/aadhaar`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch Aadhaar');
  const fileUrl = data.aadhaar?.xml?.fileUrl;
  if (!fileUrl) throw new Error('No Aadhaar file URL in response');
  return { fileUrl, aadhaarData: data };
}

export type DigiLockerFetchDocumentResponse = {
  fileUrl: string;
  validUpto: string;
};

export async function fetchDigiLockerDocument(
  id: string,
  docType: string,
  orgId: string,
  format: string,
  parameters: { name: string; value: string }[]
): Promise<DigiLockerFetchDocumentResponse> {
  if (!isDigiLockerConfigured()) {
    throw new Error('DigiLocker is not configured');
  }
  const res = await fetch(`${BASE_URL}/api/digilocker/${id}/document`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      docType,
      orgId,
      format: format || 'pdf',
      consent: 'Y',
      parameters,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to fetch document');
  if (!data.fileUrl) throw new Error('No file URL in response');
  return data;
}

/** Map DigiLocker scope codes to CivicGuard document types */
export const DIGILOCKER_SCOPE_TO_DOCTYPE: Record<string, string> = {
  ADHAR: 'Aadhar',
  PANCR: 'PAN',
  DRVLC: 'Driving License',
};

/** Standard orgIds for common documents (from DigiLocker document catalog) */
export const DIGILOCKER_ORG_IDS: Record<string, string> = {
  PAN: 'incometax',      // Income Tax Department
  'Driving License': 'morth', // Ministry of Road Transport - varies by state, use common
};

/** DigiLocker verifier pubKeyHash - used for blockchain document records */
export function getDigiLockerPubKeyHash(): string {
  return ethers.keccak256(ethers.toUtf8Bytes('digilocker.gov.in'));
}
