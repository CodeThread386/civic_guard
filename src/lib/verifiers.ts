/**
 * Verifier registry - extends contract with additional verifiers.
 * In production, verifiers would be registered on-chain.
 */
import { readJson, writeJson } from './storage';

export type VerifierInfo = {
  address: string;
  pubKeyHash: string;
  name: string;
  documentTypes: string[];
};

const FILENAME = 'verifiers.json';

export async function getVerifiers(): Promise<VerifierInfo[]> {
  const data = await readJson<VerifierInfo[]>(FILENAME);
  return data || [];
}

export async function addVerifier(info: VerifierInfo): Promise<void> {
  const list = await getVerifiers();
  if (list.some((v) => v.pubKeyHash === info.pubKeyHash)) return;
  list.push(info);
  await writeJson(FILENAME, list);
}
