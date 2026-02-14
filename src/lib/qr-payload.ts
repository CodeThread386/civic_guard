/**
 * QR payload format and validation.
 * Version 1 (legacy): { v: 1, docTypes: string[], address: string, ts: number }
 * Version 2 (Option C): URL https://.../v/{shortId}
 */
export const QR_VERSION = 1;

export type QRPayload = {
  v: number;
  docTypes: string[];
  address: string;
  ts: number;
};

export function parseQRPayload(decodedText: string): QRPayload | null {
  try {
    const parsed = JSON.parse(decodedText);
    if (typeof parsed.v !== 'number' || parsed.v !== QR_VERSION) return null;
    if (!Array.isArray(parsed.docTypes)) return null;
    if (typeof parsed.address !== 'string') return null;
    return parsed as QRPayload;
  } catch {
    return null;
  }
}

/** Extract shortId from QR content. Handles URL format (https://.../v/abc12) or raw shortId. */
export function extractShortIdFromQR(decodedText: string): string | null {
  const trimmed = decodedText.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/v\/([a-z0-9]+)$/i);
      return match ? match[1] : null;
    }
    if (/^[a-z0-9]{6,12}$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Get the verify API base URL from QR content. Uses QR origin if URL, else current origin. */
export function getVerifyApiBaseFromQR(decodedText: string): string {
  const trimmed = decodedText.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      return url.origin;
    }
  } catch {
    // fall through
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}
