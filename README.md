# CivicGuard

Blockchain-based document verification and issuance platform built with Next.js, Solidity, and ethers.js.

## Hackathon Demo

**One command to run everything:**

```bash
npm run start-all
```

Then open [http://localhost:3000](http://localhost:3000).

Or manually: `npx hardhat node` (Terminal 1) → `npm run setup-demo` then `npm run dev` (Terminal 2).

See [HACKATHON_DEMO.md](HACKATHON_DEMO.md) for the full demo flow and judge walkthrough.

## Features

- **Passwordless Auth**: Email OTP flow (Resend integration for real emails)
- **Multi-device Login**: Email→wallet mapping stored server-side for login from any device
- **Role-based Access**: Users request documents; Verifiers issue and verify
- **Blockchain Storage**: Document hashes stored on-chain with user/verifier identifiers
- **Local Hash Storage**: Document hashes also stored locally per spec
- **Secure Document Flow**: Document is hashed client-side (SHA-256), original is never persisted
- **File Upload**: Support for PDF/image upload in addition to form-based requests
- **Verifier Auth**: Cryptographic signature required for approve/reject
- **Request Review UI**: Verifiers can view form data before approving
- **Multiple Verifiers**: Extensible verifier list with per-verifier document types
- **QR Verification**: Versioned QR payload; users display document types; verifiers scan and compare
- **Persistent Storage**: OTP, document requests, and user registry use file-based persistence

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and configure:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
SMTP_USER=                # Gmail address
SMTP_PASS=                # Gmail App Password
ENCRYPTION_SECRET=        # For user registry (use strong secret in production)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=   # Optional: Google OAuth client ID (from Google Cloud Console)
```

### 3. Compile & deploy the smart contract

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy contract
npm run deploy
```

Add the deployed contract address to `.env.local`.

### 5. Seed the issuer (optional)

To add rarealriree@gmail.com as a pre-registered issuer:

```bash
npm run seed-issuer
```

This registers the issuer on-chain and adds them to the user registry. They can then **login** (not sign up) with OTP.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note**: Camera/QR scanning requires HTTPS or localhost (secure context).

## User Flow

### Authentication
1. Choose Login or Sign Up
2. Select role: **User** or **Verifier**
3. Enter email → receive OTP (via Resend if configured, else console in dev)
4. Verify OTP
5. **Signup**: Wallet generated, registered on blockchain, stored in backend for multi-device
6. **Login**: Fetches wallet from backend (works from any device after OTP verification)

### User Dashboard
- **Upload Document**: Select verifier → document type → fill form and/or upload file → submit
- Verifier approves → document received → hashed → original deleted → hash stored locally + blockchain
- **QR Code**: Version 1 payload with document types (local + chain merged)

### Verifier Dashboard
- **Checklist**: Select required document types
- **Scan QR**: Camera (requires secure context); validates versioned payload
- **Result**: Green = has document, Red = missing
- **Pending Requests**: Review (view form data) → Approve/Reject with signature
- Auto-refresh every 5 seconds

## Project Structure

```
├── contracts/          # Solidity smart contracts
├── data/               # Persistent storage (OTP, requests, users, verifiers)
├── scripts/            # Deployment scripts
├── src/
│   ├── app/            # Next.js app router pages & API
│   ├── components/     # React components
│   ├── context/        # Auth context
│   └── lib/            # Utilities (crypto, blockchain, storage, etc.)
```

## Security Notes

- Document content is **never stored**. Only the SHA-256 hash is persisted (on-chain and locally).
- OTP, document requests, and user registry use file-based persistence (`data/`).
- Wallet private keys are encrypted (AES-256-GCM) in the user registry.
- Verifier approve/reject requires a signed message to prevent unauthorized actions.
