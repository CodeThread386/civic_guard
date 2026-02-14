/**
 * User registry for multi-device login.
 * Maps email -> wallet (encrypted at rest).
 */
import { readJson, writeJson } from './storage';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const FILENAME = 'user-registry.json';

type UserRecord = {
  email: string;
  address: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  role: 'user' | 'verifier';
};

type RegistryData = Record<string, UserRecord>;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'civicguard-dev-secret-change-in-production';
  return scryptSync(secret, 'civicguard-salt', 32);
}

export async function registerUser(
  email: string,
  address: string,
  privateKey: string,
  role: 'user' | 'verifier'
): Promise<void> {
  const data = await readJson<RegistryData>(FILENAME) || {};
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  data[email.toLowerCase().trim()] = {
    email: email.toLowerCase().trim(),
    address,
    encryptedPrivateKey: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
    salt: 'civicguard',
    role,
  };
  await writeJson(FILENAME, data);
}

export async function getUserByEmail(email: string): Promise<{
  address: string;
  privateKey: string;
  role: 'user' | 'verifier';
} | null> {
  const data = await readJson<RegistryData>(FILENAME) || {};
  const record = data[email.toLowerCase().trim()];
  if (!record) return null;

  const key = getEncryptionKey();
  const buf = Buffer.from(record.encryptedPrivateKey, 'base64');
  const authTag = buf.subarray(buf.length - 16);
  const encrypted = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.iv, 'base64')
  );
  decipher.setAuthTag(authTag);
  const privateKey = decipher.update(encrypted) + decipher.final('utf8');

  return {
    address: record.address,
    privateKey,
    role: record.role,
  };
}
