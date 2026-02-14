// Document type schemas - form fields per document type
export const DOCUMENT_SCHEMAS: Record<string, { label: string; type: string }[]> = {
  Aadhar: [
    { label: 'Aadhar Number', type: 'text' },
    { label: 'Full Name', type: 'text' },
    { label: 'Date of Birth', type: 'date' },
    { label: 'Address', type: 'text' },
  ],
  PAN: [
    { label: 'PAN Number', type: 'text' },
    { label: 'Full Name', type: 'text' },
    { label: 'Father\'s Name', type: 'text' },
    { label: 'Date of Birth', type: 'date' },
  ],
  Degree: [
    { label: 'University Name', type: 'text' },
    { label: 'Degree', type: 'text' },
    { label: 'Year of Completion', type: 'text' },
    { label: 'Roll Number', type: 'text' },
  ],
  Passport: [
    { label: 'Passport Number', type: 'text' },
    { label: 'Full Name', type: 'text' },
    { label: 'Date of Birth', type: 'date' },
    { label: 'Date of Issue', type: 'date' },
    { label: 'Date of Expiry', type: 'date' },
  ],
  'Driving License': [
    { label: 'License Number', type: 'text' },
    { label: 'Full Name', type: 'text' },
    { label: 'Valid From', type: 'date' },
    { label: 'Valid Until', type: 'date' },
  ],
};
