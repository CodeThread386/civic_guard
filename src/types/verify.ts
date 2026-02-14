export type VerifyDocResult = {
  documentType: string;
  onChain: boolean;
  metadata?: Record<string, string>;
  ageCheck?: { required: boolean; passed: boolean | null; age?: number };
  expiryCheck?: { required: boolean; passed: boolean | null };
};

export type VerifyResult = {
  valid: boolean;
  address: string;
  docTypes: string[];
  results: VerifyDocResult[];
  error?: string;
};
