CivicGuard – Local Setup Guide
Prerequisites
Before cloning, ensure you have:
Requirement	Version	Check
Node.js	18.x or 20.x	node --version
npm	9.x or 10.x	npm --version
Git	Any recent	git --version
Step 1: Clone the Repository
git clone https://github.com/YOUR_USERNAME/CivicGuard.gitcd CivicGuard
Replace YOUR_USERNAME with your GitHub username or org.
Step 2: Install Dependencies
npm install
Step 3: Environment Configuration
Create .env.local from the example:
cp .env.example .env.local
Edit .env.local and set:
Variable	Required	Description
NEXT_PUBLIC_CONTRACT_ADDRESS	No*	Set automatically by setup-demo
NEXT_PUBLIC_RPC_URL	No	Default: http://127.0.0.1:8545
SMTP_USER	No | Gmail address for OTP emails | | SMTP_PASS | No	Gmail App Password (not normal password)
ENCRYPTION_SECRET	No	For user registry; dev default is used if empty
NEXT_PUBLIC_GOOGLE_CLIENT_ID	No	Google OAuth client ID (optional)
\* setup-demo writes the deployed contract address into .env.local.
\ Without SMTP, OTPs are logged in the terminal and shown on the auth screen in dev.
Minimum for first run: Leave .env.local as-is or with only NEXT_PUBLIC_RPC_URL set. The rest can stay empty.
Step 4: Start the Project
Option A: One Command (recommended)
npm run start-all
This will:
Start the Hardhat node (port 8545)
Deploy the CivicGuard contract
Update .env.local with the contract address
Seed the issuer (rarealriree@gmail.com as CivicGuard Issuer)
Start the Next.js dev server (port 3000)
When you see Ready in X.Xs, open:
http://localhost:3000
Option B: Manual (two terminals)
Terminal 1 – blockchain (keep running):
npx hardhat node
Terminal 2 – setup and app:
npm run setup-demonpm run dev
Then open http://localhost:3000.
Step 5: Verify It Works
Home – Visit http://localhost:3000
Auth – Click “Get Started” → Sign Up → Volunteer → enter email → OTP (terminal or email)
Issuer – Login as Issuer with rarealriree@gmail.com (pre-seeded)
Verifier – Visit http://localhost:3000/verifier (no login)
Optional: Email OTP (Gmail)
Enable 2FA on your Gmail account.
Create an App Password: Google Account → Security → 2-Step Verification → App passwords.
Add to .env.local:
   SMTP_USER=your-email@gmail.com   SMTP_PASS=your-16-char-app-password
Restart the dev server.
Optional: Google OAuth
Go to Google Cloud Console.
Create OAuth 2.0 credentials (Web application).
Authorized JavaScript origins: http://localhost:3000
Authorized redirect URIs: http://localhost:3000
Add to .env.local:
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
Restart the dev server.
Useful Commands
Command	Description
npm run start-all	Start Hardhat + setup + Next.js
npm run reset	Clear data, restart blockchain, redeploy, start app
npm run dev	Start Next.js only (Hardhat must be running)
npm run setup-demo	Deploy contract and seed issuer (Hardhat must be running)
npx hardhat node	Start local blockchain only
npm run compile	Compile Solidity contracts
Troubleshooting
Issue	Fix
Port 3000 or 8545 in use	Run npm run reset to stop and restart, or manually kill processes on those ports
"Hardhat node is not running"	Start npx hardhat node in another terminal before setup-demo or dev
"Blockchain not configured"	Run npm run setup-demo with Hardhat running
"Blockchain registration failed"	Ensure Hardhat node is running and setup-demo completed
OTP not received	Check terminal logs (dev mode) or configure SMTP
Camera not working for QR	Use localhost or HTTPS (secure context required)
Google OAuth "origin not allowed"	Add http://localhost:3000 to Authorized JavaScript origins
Fresh start	Run npm run reset and clear browser site data (F12 → Application → Clear site data)
Project Structure
CivicGuard/├── contracts/          # Solidity smart contracts├── data/               # Runtime data (created by app; not in git)├── scripts/            # Deployment and setup scripts├── src/│   ├── app/            # Next.js pages and API routes│   ├── components/     # React components│   ├── context/        # Auth context│   └── lib/            # Utilities (blockchain, crypto, storage)├── .env.example        # Environment template└── package.json
Pre-seeded Issuer
After setup-demo or start-all:
Email: rarealriree@gmail.com
Role: Issuer (CivicGuard Issuer)
Login: Use Login (not Sign Up) with OTP
Summary Checklist
[ ] Clone repo
[ ] npm install
[ ] Copy .env.example to .env.local
[ ] Run npm run start-all
[ ] Open http://localhost:3000
[ ] (Optional) Configure SMTP for email OTP
[ ] (Optional) Configure Google OAuth