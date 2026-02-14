import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, setUserBlockchainRegistered } from '@/lib/user-registry';
import { registerUserOnChain } from '@/lib/blockchain';
import { fundWallet } from '@/lib/fund-wallet';
import { addVerifier } from '@/lib/verifiers';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.blockchainRegistered !== false) {
      return NextResponse.json({ success: true, message: 'Already registered on blockchain' });
    }

    const fundResult = await fundWallet(user.address);
    if (!fundResult.success) {
      return NextResponse.json(
        { error: fundResult.error || 'Failed to fund wallet. Is Hardhat node running?' },
        { status: 503 }
      );
    }

    await registerUserOnChain(user.privateKey, user.role === 'verifier');
    await setUserBlockchainRegistered(email.toLowerCase().trim());

    if (user.role === 'verifier') {
      const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(user.address));
      await addVerifier({
        address: user.address,
        pubKeyHash,
        name: `Verifier ${user.address.slice(0, 8)}...`,
        documentTypes: ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete blockchain error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete registration' },
      { status: 500 }
    );
  }
}
