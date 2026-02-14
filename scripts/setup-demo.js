/**
 * One-command setup for hackathon demo.
 * Deploys contract, seeds issuer, updates .env.local.
 *
 * Prerequisite: npx hardhat node (must be running in another terminal)
 * Run: npx hardhat run scripts/setup-demo.js --network localhost
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const ISSUER_EMAIL = "rarealriree@gmail.com";
const ISSUER_NAME = "CivicGuard Issuer";
const ACCOUNT_1_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

function updateEnvLocal(contractAddress) {
  const rpcUrl = "http://127.0.0.1:8545";
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
    const lines = content.split("\n");
    let updated = false;
    const newLines = lines.map((line) => {
      if (line.startsWith("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
        updated = true;
        return `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`;
      }
      if (line.startsWith("NEXT_PUBLIC_RPC_URL=")) {
        return `NEXT_PUBLIC_RPC_URL=${rpcUrl}`;
      }
      return line;
    });
    if (!updated) {
      const idx = newLines.findIndex((l) => l.startsWith("NEXT_PUBLIC_RPC_URL="));
      if (idx >= 0) {
        newLines.splice(idx, 0, `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
      } else {
        newLines.unshift(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`, `NEXT_PUBLIC_RPC_URL=${rpcUrl}`);
      }
    }
    content = newLines.join("\n");
  } else {
    content = `# Blockchain
NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}
NEXT_PUBLIC_RPC_URL=${rpcUrl}

# Email OTP (Gmail SMTP - use App Password)
SMTP_USER=
SMTP_PASS=

# Encryption (for user registry - use strong secret in production)
ENCRYPTION_SECRET=
`;
  }
  fs.writeFileSync(envPath, content);
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = contractAddress;
}

async function main() {
  const hre = require("hardhat");
  const { ethers } = require("ethers");

  console.log("Checking Hardhat node...");
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    await provider.getBlockNumber();
  } catch (e) {
    console.error("\nError: Hardhat node is not running.");
    console.error("Start it first: npx hardhat node");
    console.error("Then run: npm run setup-demo\n");
    process.exit(1);
  }

  console.log("Deploying CivicGuard contract...");
  const [deployer] = await hre.ethers.getSigners();
  const defaultVerifierPubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(deployer.address));

  const CivicGuard = await hre.ethers.getContractFactory("CivicGuard");
  const contract = await CivicGuard.deploy(defaultVerifierPubKeyHash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Deployed to:", address);

  updateEnvLocal(address);
  console.log("Updated .env.local");

  console.log("Seeding issuer...");
  const wallet = new ethers.Wallet(ACCOUNT_1_PRIVATE_KEY, hre.ethers.provider);
  const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(wallet.address));

  const abi = [
    "function registerUser(bytes32 _pubKeyHash, bool _isVerifier) external",
    "function userExists(address) view returns (bool)",
  ];
  const civicContract = new ethers.Contract(address, abi, wallet);

  const exists = await civicContract.userExists(wallet.address);
  if (exists) {
    console.log("Issuer already registered on chain:", wallet.address);
  } else {
    const tx = await civicContract.registerUser(pubKeyHash, true);
    await tx.wait();
    console.log("Registered issuer on chain:", wallet.address);
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const encryptionSecret = process.env.ENCRYPTION_SECRET || "civicguard-dev-secret-change-in-production";
  const crypto = require("crypto");
  const key = crypto.scryptSync(encryptionSecret, "civicguard-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(wallet.privateKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const userRegistryPath = path.join(dataDir, "user-registry.json");
  let userRegistry = {};
  if (fs.existsSync(userRegistryPath)) {
    userRegistry = JSON.parse(fs.readFileSync(userRegistryPath, "utf8"));
  }
  userRegistry[ISSUER_EMAIL] = {
    email: ISSUER_EMAIL,
    address: wallet.address,
    encryptedPrivateKey: Buffer.concat([encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
    salt: "civicguard",
    role: "verifier",
    blockchainRegistered: true,
  };
  fs.writeFileSync(userRegistryPath, JSON.stringify(userRegistry, null, 2));
  console.log("Added to user registry:", ISSUER_EMAIL);

  const verifiersPath = path.join(dataDir, "verifiers.json");
  let verifiers = [];
  if (fs.existsSync(verifiersPath)) {
    verifiers = JSON.parse(fs.readFileSync(verifiersPath, "utf8"));
  }
  if (!verifiers.some((v) => v.pubKeyHash === pubKeyHash)) {
    verifiers.push({
      address: wallet.address,
      pubKeyHash,
      name: ISSUER_NAME,
      documentTypes: ["Aadhar", "PAN", "Degree", "Passport", "Driving License"],
    });
    fs.writeFileSync(verifiersPath, JSON.stringify(verifiers, null, 2));
    console.log("Added to issuers list");
  }

  console.log("\nSetup complete. Run: npm run dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
