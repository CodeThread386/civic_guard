/**
 * Client-side cryptographic utilities for document hashing
 * CRITICAL: Document is hashed and then immediately discarded - never stored
 *
 * Hash algorithm: SHA-256 (standardized for document fingerprinting)
 */

export const DOCUMENT_HASH_ALGORITHM = 'SHA-256' as const;

/**
 * Generate SHA-256 hash of file/blob (used for document fingerprinting)
 * Returns hex string of the hash
 */
export async function hashDocument(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to bytes32 format for Solidity
 */
export function hexToBytes32(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return '0x' + cleanHex.padStart(64, '0').slice(0, 64);
}

/**
 * Keccak256-like hash for public key (using SHA-256 as fallback - browser doesn't have keccak)
 * For production, use ethers.keccak256 or a keccak library
 */
export async function hashPublicKey(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hex;
}
