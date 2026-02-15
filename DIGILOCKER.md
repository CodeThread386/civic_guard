# DigiLocker Integration

CivicGuard supports **DigiLocker** as an issuer. Users can connect their DigiLocker account and add verified documents (Aadhaar, PAN, Driving License) directly to CivicGuard.

**DigiLocker requires API credentials.** Without credentials, DigiLocker is not shown as an issuer option. No demo or simulation mode.

## Flow

1. User selects **DigiLocker** as issuer in "Request Document"
2. User clicks **Connect to DigiLocker** → redirected to DigiLocker login
3. User signs in and consents to share documents
4. User is redirected back → CivicGuard shows list of available documents
5. User selects which documents to add
6. Documents are fetched, hashed (SHA-256), and stored on blockchain + locally

## Setup (Required)

To use DigiLocker, you need credentials from **Setu** or **API Setu**:

1. **Contact Setu** (https://setu.co) or **API Setu** (https://apisetu.gov.in) for DigiLocker API access
2. Add to `.env.local`:

```
DIGILOCKER_API_BASE_URL=https://api.setu.co
DIGILOCKER_CLIENT_ID=your-client-id
DIGILOCKER_CLIENT_SECRET=your-client-secret
DIGILOCKER_PRODUCT_INSTANCE_ID=your-product-instance-id
```

3. Restart the dev server

DigiLocker will appear as an issuer option only when all credentials are configured.

## API Compatibility

The integration uses the **Setu DigiLocker API** format:

- `POST /api/digilocker` – Create session, get redirect URL
- `GET /api/digilocker/:id/status` – Get session status
- `GET /api/digilocker/:id/aadhaar` – Fetch Aadhaar document
- `POST /api/digilocker/:id/document` – Fetch other documents (PAN, Driving License)

If using a different provider (e.g. API Setu), you may need to adjust `DIGILOCKER_API_BASE_URL` and ensure the API responses match the expected format.

## Document Types

| DigiLocker Scope | CivicGuard Type |
|------------------|-----------------|
| ADHAR            | Aadhar          |
| PANCR            | PAN             |
| DRVLC            | Driving License |
