/**
 * Seed rarealriree@gmail.com as an issuer.
 * Uses Hardhat account 1 (has ETH on localhost).
 * Run: npx hardhat run scripts/seed-issuer.js --network localhost
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
const hre = require("hardhat");
const { ethers } = require("ethers");

const ISSUER_EMAIL = "rarealriree@gmail.com";
const ISSUER_NAME = "CivicGuard Issuer";

// Hardhat default account 1 private key (from "test test... junk" mnemonic)
const ACCOUNT_1_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local first");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet(ACCOUNT_1_PRIVATE_KEY, provider);
  const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(wallet.address));

  const abi = [
    "function registerUser(bytes32 _pubKeyHash, bool _isVerifier) external",
    "function userExists(address) view returns (bool)",
  ];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const exists = await contract.userExists(wallet.address);
  if (exists) {
    console.log("Issuer already registered on chain:", wallet.address);
  } else {
    const tx = await contract.registerUser(pubKeyHash, true);
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

  console.log("\nDone! Issuer rarealriree@gmail.com can now login with OTP.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
