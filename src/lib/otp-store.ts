/**
 * OTP store with file persistence.
 * Falls back to in-memory when file ops fail (e.g. read-only env).
 */
import { readJson, writeJson } from './storage';

type OtpEntry = { otp: string; expiresAt: number };
type OtpData = Record<string, OtpEntry>;

const FILENAME = 'otp.json';
const memoryFallback = new Map<string, OtpEntry>();

async function load(): Promise<OtpData> {
    const data = await readJson<OtpData>(FILENAME);
    return data || {};
}

async function save(data: OtpData): Promise<void> {
    try {
        await writeJson(FILENAME, data);
    } catch (e) {
        console.warn('OTP save failed, using memory:', e);
    }
}

export async function otpSet(email: string, entry: OtpEntry): Promise<void> {
    memoryFallback.set(email, entry);
    const data = await load();
    data[email] = entry;
    await save(data);
}

export async function otpGet(email: string): Promise<OtpEntry | undefined> {
    const mem = memoryFallback.get(email);
    if (mem) return mem;
    const data = await load();
    const entry = data[email];
    if (entry) memoryFallback.set(email, entry);
    return entry;
}

export async function otpDelete(email: string): Promise<void> {
    memoryFallback.delete(email);
    const data = await load();
    delete data[email];
    await save(data);
}
