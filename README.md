<div align="center">

<!-- Logo Placeholder -->
<img src="https://via.placeholder.com/150x150.png?text=CG" alt="CivicGuard Logo" width="150" height="150" />

# CivicGuard

**Decentralized Identity Verification for a Privacy-First Future**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.19-363636)](https://soliditylang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Why CivicGuard?

In today's digital world, identity verification systems are **centralized, opaque, and vulnerable to data breaches**. Organizations hold your sensitive documents, often without your knowledge or control. Users have no way to prove their identity without surrendering their data to third parties.

**CivicGuard changes that.**

Built on blockchain technology, CivicGuard empowers individuals with **self-sovereign identity**—a system where you control who sees your verified credentials, when, and how. Issuers (governments, institutions, employers) verify and issue documents on-chain. Volunteers (users) store and share them securely via QR codes. Verifiers (businesses, services) check authenticity **without accessing the original document**.

Privacy-first. Decentralized. Transparent.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔐 On-Chain Verification
Documents are hashed and registered on the blockchain, ensuring tamper-proof verification without exposing sensitive data.

</td>
<td width="50%">

### 📱 QR-Based Sharing
Share verified credentials via secure, short-lived QR codes—no need to hand over physical documents or original files.

</td>
</tr>
<tr>
<td width="50%">

### ✉️ SMTP & OAuth Integration
Seamless email OTP authentication with optional Google OAuth support for a frictionless user experience.

</td>
<td width="50%">

### 🌐 Progressive Web App (PWA)
Install CivicGuard on any device for an app-like experience with offline capabilities and biometric security.

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Zero-Knowledge Proofs
Prove your identity attributes (age, citizenship, etc.) without revealing underlying data using advanced cryptography.

</td>
<td width="50%">

### ⚡ Instant Verification
Real-time document validation via blockchain lookups—no waiting, no manual checks, no third-party delays.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Check |
|------------|---------|--------|
| **Node.js** | 18.x or 20.x | `node --version` |
| **npm** | 9.x or 10.x | `npm --version` |
| **Git** | Any recent | `git --version` |

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/CivicGuard.git
   cd CivicGuard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env.local` from the example template:
   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables in `.env.local`:

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | Auto-set* | Deployed contract address (auto-populated by setup script) |
   | `NEXT_PUBLIC_RPC_URL` | No | Blockchain RPC endpoint (default: `http://127.0.0.1:8545`) |
   | `SMTP_USER` | No** | Gmail address for OTP emails |
   | `SMTP_PASS` | No** | Gmail App Password (not regular password) |
   | `ENCRYPTION_SECRET` | No | User registry encryption key (dev default provided) |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for Sign in with Google |

   > **\*Note:** The `setup-demo` script automatically writes the deployed contract address to `.env.local`.
   > 
   > **\*\*Note:** Without SMTP configuration, OTPs are logged to the terminal and displayed on the auth screen in development mode.

   **Minimum for first run:** Leave `.env.local` as-is or with only `NEXT_PUBLIC_RPC_URL` set. Other variables can remain empty for initial testing.

4. **Start the Application**

   **Option A: One Command (Recommended)**
   ```bash
   npm run start-all
   ```
   This command will:
   - Start the Hardhat blockchain node (port 8545)
   - Deploy the CivicGuard smart contract
   - Update `.env.local` with the contract address
   - Seed the default issuer (`rarealriree@gmail.com`)
   - Launch the Next.js development server (port 3000)

   When you see `Ready in X.Xs`, open:
   ```
   http://localhost:3000
   ```

   **Option B: Manual Setup (Two Terminals)**
   
   Terminal 1 – Start blockchain node (keep running):
   ```bash
   npx hardhat node
   ```

   Terminal 2 – Setup and run application:
   ```bash
   npm run setup-demo
   npm run dev
   ```

   Then open `http://localhost:3000`.

5. **Verify Installation**
   - **Home:** Visit `http://localhost:3000`
   - **Auth:** Click "Get Started" → Sign Up → Volunteer → Enter email → OTP
   - **Issuer:** Login as Issuer with `rarealriree@gmail.com` (pre-seeded)
   - **Verifier:** Visit `http://localhost:3000/verifier` (no login required)

---

## 📖 Usage

CivicGuard operates on a three-actor model: **Volunteers**, **Issuers**, and **Verifiers**. Here's how they interact:

### 1️⃣ **Volunteer** (User) – Request a Document

1. Navigate to `http://localhost:3000` and click **Get Started**
2. Choose **Sign Up** → **Volunteer**
3. Enter your email (e.g., `volunteer@test.com`)
4. Enter the OTP (received via email or displayed in terminal/screen)
5. Click **Request Document**
6. Select **Default Issuer** → **Aadhar** (or other document types)
7. Fill in the form:
   - Aadhar Number
   - Full Name
   - Date of Birth
   - Address
8. Click **Submit Request**

---

### 2️⃣ **Issuer** (Authority) – Approve and Issue Document

1. Open a new browser tab or incognito window
2. Go to `http://localhost:3000/auth`
3. Choose **Login** → **Issuer**
4. Email: `rarealriree@gmail.com` (pre-seeded default issuer)
5. Enter OTP (check email or terminal logs)
6. Click **Review** on the pending request
7. **Upload** the verified document (PDF or image)
8. Click **Approve & Send Document**

The system will:
- Hash the document using SHA-256
- Register the hash on-chain
- Store encrypted metadata
- Notify the volunteer

---

### 3️⃣ **Volunteer** – Receive and Share

1. Return to the Volunteer dashboard
2. Wait for "Processing your document…" (polls every 2 seconds)
3. Once processed, the document appears with status **Verified**
4. Click **Share for Verification**
5. A **QR code** appears with a short-lived verification URL (valid for 10 minutes)

---

### 4️⃣ **Verifier** (Business/Service) – Scan and Verify

1. Open `http://localhost:3000/verifier` (no login required)
2. Select document type: **Aadhar**
3. Optionally enable constraints:
   - ✅ Require age 18+
   - ✅ Require document not expired
4. Click **Scan QR**
5. Scan the Volunteer's QR code (using device camera)
6. See **Verification Passed** with:
   - ✅ On-chain hash match
   - ✅ Metadata validation
   - ✅ Policy compliance

**No sensitive data is shared.** The verifier confirms authenticity without accessing the original document.

---

## 📁 Project Structure

```
CivicGuard/
├── contracts/              # Solidity smart contracts
│   └── CivicGuard.sol      # Core identity verification contract
├── data/                   # Runtime data (not tracked in git)
│   ├── wallets.json        # User wallet registry
│   └── otps.json           # Temporary OTP storage
├── scripts/                # Deployment and automation scripts
│   ├── deploy.js           # Contract deployment
│   ├── seed-issuer.js      # Pre-seed default issuer
│   ├── setup-demo.js       # One-command demo setup
│   └── start-all.js        # Orchestrates blockchain + app startup
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API routes (auth, documents, verification)
│   │   ├── volunteer/      # Volunteer dashboard
│   │   ├── issuer/         # Issuer dashboard
│   │   └── verifier/       # Verifier interface
│   ├── components/         # React components
│   │   ├── AuthForm.jsx
│   │   ├── QRScanner.jsx
│   │   └── ShareModal.jsx
│   ├── context/            # React Context (AuthContext)
│   └── lib/                # Core utilities
│       ├── blockchain.ts   # Ethereum/contract interaction
│       ├── crypto.ts       # Hashing, encryption
│       ├── storage.ts      # Local data persistence
│       └── zkProver.ts     # Zero-knowledge proof generation
├── .env.example            # Environment variable template
├── hardhat.config.js       # Hardhat configuration
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run start-all` | **Recommended:** Start Hardhat node, deploy contracts, seed data, and launch dev server |
| `npm run reset` | Clear all data, restart blockchain, redeploy contracts, and start fresh |
| `npm run dev` | Start Next.js dev server only (requires Hardhat node to be running) |
| `npm run setup-demo` | Deploy contract and seed issuer (requires Hardhat node to be running) |
| `npx hardhat node` | Start local blockchain node only (port 8545) |
| `npm run compile` | Compile Solidity smart contracts |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end Playwright tests |

---

## 🔧 Optional Configuration

### Email OTP (Gmail)

To enable email-based OTP delivery:

1. Enable **2-Factor Authentication** on your Gmail account
2. Create an **App Password**:
   - Google Account → Security → 2-Step Verification → App passwords
3. Add to `.env.local`:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```
4. Restart the development server

### Google OAuth

To enable "Sign in with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth 2.0 credentials** (Web application)
3. Configure:
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `http://localhost:3000`
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
5. Restart the development server
6. **Important:** Ensure Hardhat node is running (`npx hardhat node`) for wallet funding during signup

---

## ❗ Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 or 8545 already in use | Run `npm run reset` or manually kill processes on those ports |
| "Hardhat node is not running" | Start `npx hardhat node` in a separate terminal before running setup or dev |
| "Blockchain not configured" | Run `npm run setup-demo` with Hardhat node running |
| "Blockchain registration failed" | Ensure Hardhat node is running and setup completed successfully |
| OTP not received | Check terminal logs (dev mode) or configure SMTP with Gmail App Password |
| Camera not working for QR scanning | QR scanning requires `localhost` or HTTPS (secure context) |
| Google OAuth "origin not allowed" | Add `http://localhost:3000` to Authorized JavaScript origins in Google Cloud Console |
| Need a fresh start | Run `npm run reset` and clear browser site data (F12 → Application → Clear site data) |

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, improving documentation, or proposing new features, your input is valued.

**Please read our [Contributing Guidelines](CONTRIBUTING.md)** (coming soon) before submitting a pull request.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🔒 Security

We take security seriously. If you discover a security vulnerability, please **do not** open a public issue.

**Report security issues to:** [security@civicguard.example](mailto:security@civicguard.example)

For more information, see our [Security Policy](SECURITY.md) (coming soon).

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

Built with:
- [Next.js 14](https://nextjs.org/) – React framework for production
- [Hardhat](https://hardhat.org/) – Ethereum development environment
- [Ethers.js](https://docs.ethers.org/) – Ethereum library
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS framework
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) – QR code scanning
- [qrcode.react](https://github.com/zpao/qrcode.react) – QR code generation

---

## 📞 Support

- **Documentation:** Check this README and [HACKATHON_DEMO.md](HACKATHON_DEMO.md)
- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/CivicGuard/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/CivicGuard/discussions)

---

<div align="center">

**Made with ❤️ for a decentralized future**

[Website](#) • [Documentation](#) • [Demo](#) • [Twitter](#)

</div>
