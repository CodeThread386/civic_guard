/**
 * Uses the device's native unlock - same password, fingerprint, or Face ID
 * you use to unlock your laptop or phone. No separate CivicGuard verification.
 * - Laptop: Windows Hello (PIN/fingerprint/face), Mac Touch ID or password
 * - Phone: Fingerprint, Face ID, or device PIN
 */

const STORAGE_KEY_PREFIX = 'civicguard_webauthn_';

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getRpId(): string {
  if (typeof window === 'undefined') return 'localhost';
  const host = window.location.hostname;
  return host === '127.0.0.1' ? 'localhost' : host;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials &&
    !!window.PublicKeyCredential
  );
}

export function getStoredCredentialId(address: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + address.toLowerCase());
  } catch {
    return null;
  }
}

/**
 * Register a new platform credential (fingerprint/Face ID/PIN) for the user.
 * Call once per user; subsequent shares use verifyWithDevice().
 */
export async function registerPlatformCredential(address: string): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error('This browser does not support device unlock. Use Chrome or Edge on Windows/Android, or Safari on Mac/iPhone.');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const userId = new TextEncoder().encode(address.toLowerCase().slice(0, 64));

  const options: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: {
        id: getRpId(),
        name: 'CivicGuard',
      },
      user: {
        id: userId,
        name: address,
        displayName: 'CivicGuard User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      attestation: 'none',
      timeout: 60000,
    },
  };

  const credential = (await navigator.credentials.create(options)) as PublicKeyCredential | null;
  if (!credential) {
    throw new Error('Unlock was cancelled. Use your device password, fingerprint, or Face ID.');
  }

  const credentialId = bufferToBase64Url(credential.rawId);
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + address.toLowerCase(), credentialId);
  } catch {
    // localStorage full; credential still works for this session
  }
  return credentialId;
}

/**
 * Verify using device's native unlock (same password/fingerprint/Face ID as unlocking device).
 * First tries credential-less get (uses device's existing unlock).
 * If no credential exists, creates one (one-time setup using same device unlock).
 */
export async function verifyWithDevice(address: string): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('This browser does not support device unlock. Use Chrome or Edge on Windows/Android, or Safari on Mac/iPhone.');
  }

  const storedId = getStoredCredentialId(address);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const options: CredentialRequestOptions = {
    publicKey: {
      challenge,
      rpId: getRpId(),
      ...(storedId
        ? {
          allowCredentials: [
            { type: 'public-key' as const, id: base64UrlToBuffer(storedId) },
          ],
        }
        : {}),
      userVerification: 'required',
      timeout: 60000,
    },
  };

  let credential = (await navigator.credentials.get(options)) as PublicKeyCredential | null;

  if (!credential && !storedId) {
    // No credential yet: one-time setup - create credential using device unlock
    const credId = await registerPlatformCredential(address);
    return !!credId;
  }

  return !!credential;
}

/**
 * Single entry point: verify user identity before share.
 * Registers if needed, then verifies with fingerprint/Face ID/PIN.
 */
export async function verifyIdentityBeforeShare(address: string): Promise<void> {
  const verified = await verifyWithDevice(address);
  if (!verified) {
    throw new Error('Unlock cancelled. Use your device password, fingerprint, or Face ID and try again.');
  }
}
