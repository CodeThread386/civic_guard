import { ethers } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545';
const FAUCET_KEY =
  process.env.FAUCET_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export async function fundWallet(address: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!address || typeof address !== 'string') {
      return { success: false, error: 'address required' };
    }
    if (!ethers.isAddress(address)) {
      return { success: false, error: 'Invalid address' };
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_KEY, provider);
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther('0.1'),
    });
    await tx.wait();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fund wallet',
    };
  }
}
