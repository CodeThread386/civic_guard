# CivicGuard Hackathon Demo

## Quick Start

### Option A: One command (recommended)

```bash
npm run start-all
```

This starts Hardhat node, runs setup-demo, and launches the dev server. Open [http://localhost:3000](http://localhost:3000) when ready.

### Option B: Manual (2 terminals)

1. **Terminal 1** – Start the blockchain node (leave running):
   ```bash
   npx hardhat node
   ```

2. **Terminal 2** – Setup and run the app:
   ```bash
   npm run setup-demo
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

---

## Demo Flow for Judges

### 1. Volunteer requests a document

- Click **Get Started**
- Choose **Sign Up** → **Volunteer**
- Enter any email (e.g. `volunteer@test.com`)
- Enter OTP (if SMTP not configured: OTP appears in terminal and on screen in dev mode)
- Complete sign up
- Click **Request Document**
- Select **Default Issuer** → **Aadhar**
- Fill the form (e.g. Aadhar Number, Full Name, Date of Birth, Address)
- Click **Submit Request**

### 2. Issuer approves with document upload

- Open a new tab or incognito window
- Go to [http://localhost:3000/auth](http://localhost:3000/auth)
- Choose **Login** → **Issuer**
- Email: `rarealriree@gmail.com` (pre-seeded issuer)
- Enter OTP (check email, or terminal if no SMTP)
- Click **Review** on the pending request
- Upload a PDF or image (the verified document)
- Click **Approve & Send Document**

### 3. Volunteer receives and shares

- Return to the Volunteer tab
- Wait for “Processing your document…” (polls every 2 seconds)
- Document is hashed, stored on-chain, and metadata saved
- Click **Share for Verification**
- QR code appears with a short-lived URL (valid 10 minutes)

### 4. Verifier scans and verifies

- Open [http://localhost:3000/verifier](http://localhost:3000/verifier) (no login)
- Select **Aadhar** (and optionally “Require age 18+” or “Require document not expired”)
- Click **Scan QR**
- Scan the Volunteer’s QR code
- See **Verification Passed** with on-chain check and metadata results

---

## Google OAuth (Optional)

To enable "Sign in with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials (Web application)
3. **Authorized JavaScript origins:** Add `http://localhost:3000` (exact match; add production URL when deploying)
4. **Authorized redirect URIs:** Add `http://localhost:3000` (required even for popup flow)
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
6. Restart the dev server
7. **For signup:** Hardhat node must be running (`npx hardhat node`) so the app can fund the new wallet

**Troubleshooting:**
- **"The given origin is not allowed"** – Add `http://localhost:3000` to Authorized JavaScript origins in Google Cloud Console
- **500 on Google sign-in** – Start Hardhat node (`npx hardhat node`) and run `npm run setup-demo` first
- **Cross-Origin-Opener-Policy / postMessage** – The app sets the required COOP header; restart the dev server after pulling updates

Without this, the email OTP flow still works.

---

## OTP Without Email

For demo without SMTP:

- Leave `SMTP_USER` and `SMTP_PASS` empty in `.env.local`
- OTP is logged in the terminal where `npm run dev` is running
- OTP is also shown on the auth screen in development mode

---

## Troubleshooting

- **“Hardhat node is not running”** – Start `npx hardhat node` in a separate terminal first
- **“Blockchain not configured”** – Run `npm run setup-demo` (with Hardhat node running)
- **Camera not working** – QR scanning needs HTTPS or localhost (secure context)
