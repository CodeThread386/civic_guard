/**
 * WebAuthn Local Device Authentication Utility
 * 
 * Provides biometric/PIN verification for sensitive operations using WebAuthn API.
 * This implementation uses a local-only credential to trigger OS-level biometric prompts
 * (FaceID, TouchID, Windows Hello, or device PIN).
 */

const CREDENTIAL_STORAGE_KEY = 'civicguard_webauthn_credential_id';

/**
 * Check if the browser supports WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         window.PublicKeyCredential !== undefined &&
         navigator.credentials !== undefined;
}

/**
 * Convert ArrayBuffer to Base64 string for storage
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string back to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate random challenge for WebAuthn
 */
function generateChallenge(): BufferSource {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * Ensure a WebAuthn credential exists for local verification.
 * Creates a new credential if one doesn't exist.
 * This is a one-time setup that runs silently.
 */
async function ensureCredentialExists(): Promise<string> {
  // Check if we already have a stored credential ID
  const storedCredentialId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  if (storedCredentialId) {
    return storedCredentialId;
  }

  // Create a new credential
  const challenge = generateChallenge();
  const userHandle = new Uint8Array(16);
  crypto.getRandomValues(userHandle);
  const userHandleTyped: BufferSource = userHandle;

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'CivicGuard',
          id: window.location.hostname,
        },
        user: {
          id: userHandleTyped,
          name: 'civicguard-user',
          displayName: 'CivicGuard User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Prefer platform authenticator (built-in)
          userVerification: 'required', // Force biometric/PIN
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential;

    if (!credential || !credential.rawId) {
      throw new Error('Failed to create credential');
    }

    // Store the credential ID for future verification
    const credentialId = arrayBufferToBase64(credential.rawId);
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
    
    return credentialId;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric setup was cancelled');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Biometric authentication is not supported on this device');
      }
    }
    throw new Error('Failed to set up biometric authentication');
  }
}

/**
 * Verify the user's identity using local device biometrics/PIN.
 * Triggers OS-level biometric prompt (FaceID, TouchID, Windows Hello, etc.)
 * 
 * @returns Promise that resolves if verification succeeds, rejects otherwise
 * @throws Error if verification fails, is cancelled, or times out
 */
export async function verifyLocalDevice(): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this browser');
  }

  try {
    // Ensure credential exists (creates one if needed)
    const credentialId = await ensureCredentialExists();
    
    // Request verification using the existing credential
    const challenge = generateChallenge();
    const credentialIdBuffer = base64ToArrayBuffer(credentialId);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credentialIdBuffer,
            type: 'public-key',
            transports: ['internal'], // Platform authenticator
          },
        ],
        userVerification: 'required', // Force biometric/PIN prompt
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error('Verification failed');
    }

    // Verification successful!
    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric verification was cancelled');
      } else if (error.name === 'InvalidStateError') {
        // Credential might be invalid, clear it and retry once
        localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
        throw new Error('Biometric credential expired. Please try again.');
      } else if (error.name === 'AbortError') {
        throw new Error('Verification timed out');
      } else if (error.message) {
        throw error;
      }
    }
    throw new Error('Biometric verification failed');
  }
}
