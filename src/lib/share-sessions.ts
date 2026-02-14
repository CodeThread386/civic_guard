/**
 * Share sessions for Option C: short-lived verification links.
 * Volunteer explicitly shares; metadata stored only for session duration.
 */
import { readJson, writeJson } from './storage';

const SHARE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type ShareSession = {
  shortId: string;
  address: string;
  docTypes: string[];
  metadata: Record<string, Record<string, string>>; // docType -> { dob, name, expiry, ... }
  createdAt: number;
  expiresAt: number;
};

const FILENAME = 'share-sessions.json';

async function load(): Promise<Record<string, ShareSession>> {
  const data = await readJson<Record<string, ShareSession>>(FILENAME);
  return data || {};
}

async function save(data: Record<string, ShareSession>): Promise<void> {
  await writeJson(FILENAME, data);
}

function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function createShareSession(
  address: string,
  docTypes: string[],
  metadata: Record<string, Record<string, string>>
): Promise<string> {
  const shortId = generateShortId();
  const now = Date.now();
  const session: ShareSession = {
    shortId,
    address,
    docTypes,
    metadata,
    createdAt: now,
    expiresAt: now + SHARE_TTL_MS,
  };
  const data = await load();
  data[shortId] = session;
  await save(data);
  return shortId;
}

export async function getShareSession(shortId: string): Promise<ShareSession | null> {
  const data = await load();
  const session = data[shortId];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    delete data[shortId];
    await save(data);
    return null;
  }
  return session;
}
