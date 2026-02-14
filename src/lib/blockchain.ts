import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';

function requireContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract not deployed. Run `npm run deploy` and set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }
}

const CIVIC_GUARD_ABI = [
  'function registerUser(bytes32 _pubKeyHash, bool _isVerifier) external',
  'function recordDocumentAsUser(bytes32 _documentHash, bytes32 _verifierPubKeyHash, string calldata _documentType) external',
  'function userExists(address _address) external view returns (bool)',
  'function userExistsByPubKey(bytes32 _pubKeyHash) external view returns (bool)',
  'function getUserDocumentTypes(bytes32 _userPubKeyHash) external view returns (string[])',
  'function getVerifierDocumentTypes(bytes32 _verifierPubKeyHash) external view returns (string[])',
  'function getDefaultVerifierPubKeyHash() external view returns (bytes32)',
  'function defaultVerifierPubKeyHash() external view returns (bytes32)',
];

export type WalletState = {
  address: string;
  privateKey: string;
  publicKey?: string;
};

export async function getProvider(): Promise<ethers.JsonRpcProvider> {
  // Always use app RPC (local Hardhat for demo). Do not use MetaMask - the app
  // creates wallets programmatically and the contract is deployed on localhost.
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function createWallet(): WalletState {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

export function getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey);
}

export function getPubKeyHashFromWallet(wallet: ethers.Wallet): string {
  return ethers.keccak256(ethers.toUtf8Bytes(wallet.address));
}

export async function registerUserOnChain(
  privateKey: string,
  isVerifier: boolean
): Promise<boolean> {
  requireContract();
  const provider = await getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(wallet.address));

  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, wallet);
  const tx = await contract.registerUser(pubKeyHash, isVerifier);
  await tx.wait();
  return true;
}

export async function checkUserExists(address: string): Promise<boolean> {
  requireContract();
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, provider);
  return contract.userExists(address);
}

export async function checkUserExistsByPubKey(pubKeyHash: string): Promise<boolean> {
  requireContract();
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, provider);
  return contract.userExistsByPubKey(pubKeyHash);
}

export async function recordDocumentOnChain(
  privateKey: string,
  documentHash: string,
  verifierPubKeyHash: string,
  documentType: string
): Promise<boolean> {
  requireContract();
  const provider = await getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, wallet);
  const docHashBytes32 = documentHash.length === 64 ? '0x' + documentHash : documentHash;
  const tx = await contract.recordDocumentAsUser(
    docHashBytes32,
    verifierPubKeyHash,
    documentType
  );
  await tx.wait();
  return true;
}

export async function getUserDocumentTypes(pubKeyHash: string): Promise<string[]> {
  requireContract();
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, provider);
  return contract.getUserDocumentTypes(pubKeyHash);
}

export async function getVerifierDocumentTypes(verifierPubKeyHash: string): Promise<string[]> {
  requireContract();
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, provider);
  return contract.getVerifierDocumentTypes(verifierPubKeyHash);
}

export async function getDefaultVerifierPubKeyHash(): Promise<string> {
  requireContract();
  const provider = await getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CIVIC_GUARD_ABI, provider);
  return contract.getDefaultVerifierPubKeyHash();
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
