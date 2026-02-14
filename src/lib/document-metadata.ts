/**
 * Metadata extraction per document type.
 * Stores only fields needed for verification (e.g. age 18+, expiry).
 */
export const METADATA_SCHEMA: Record<string, { field: string; label: string }[]> = {
  Aadhar: [
    { field: 'Date of Birth', label: 'dob' },
    { field: 'Full Name', label: 'name' },
  ],
  PAN: [
    { field: 'Date of Birth', label: 'dob' },
    { field: 'Full Name', label: 'name' },
  ],
  Degree: [
    { field: 'Year of Completion', label: 'graduationYear' },
    { field: 'University Name', label: 'institution' },
  ],
  Passport: [
    { field: 'Date of Birth', label: 'dob' },
    { field: 'Date of Expiry', label: 'expiry' },
    { field: 'Full Name', label: 'name' },
  ],
  'Driving License': [
    { field: 'Valid Until', label: 'expiry' },
    { field: 'Date of Birth', label: 'dob' },
    { field: 'Full Name', label: 'name' },
  ],
};

export function extractMetadata(documentType: string, formData: Record<string, string>): Record<string, string> {
  const schema = METADATA_SCHEMA[documentType];
  if (!schema) return {};
  const meta: Record<string, string> = {};
  for (const { field, label } of schema) {
    const val = formData[field];
    if (val) meta[label] = val;
  }
  return meta;
}
