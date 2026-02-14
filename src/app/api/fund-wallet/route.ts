import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545';
// Hardhat account 0 - has 10000 ETH on local node. For demo only.
const FAUCET_KEY =
  process.env.FAUCET_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address required' }, { status: 400 });
    }
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(FAUCET_KEY, provider);
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther('0.1'),
    });
    await tx.wait();
    return NextResponse.json({ success: true, txHash: tx.hash });
  } catch (error) {
    console.error('Fund wallet error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fund wallet' },
      { status: 500 }
    );
  }
}
