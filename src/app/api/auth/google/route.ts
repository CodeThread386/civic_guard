import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { getUserByEmail, registerUser } from '@/lib/user-registry';
import { createWallet, registerUserOnChain, checkUserExists } from '@/lib/blockchain';
import { fundWallet } from '@/lib/fund-wallet';
import { addVerifier } from '@/lib/verifiers';
import { ethers } from 'ethers';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, role, mode } = body;

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json({ error: 'Google credential required' }, { status: 400 });
    }
    if (!role || !['user', 'verifier'].includes(role)) {
      return NextResponse.json({ error: 'Valid role required (user or verifier)' }, { status: 400 });
    }
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local' },
        { status: 500 }
      );
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json({ error: 'Invalid Google token: no email' }, { status: 400 });
    }

    const email = payload.email.toLowerCase().trim();
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      const exists = await checkUserExists(existingUser.address);
      if (!exists) {
        return NextResponse.json(
          { error: 'Account not found on blockchain. Please sign up again.' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        action: 'login',
        email,
        address: existingUser.address,
        privateKey: existingUser.privateKey,
        role: existingUser.role,
      });
    }

    if (mode === 'login') {
      return NextResponse.json(
        { error: 'No account found for this Google email. Please sign up first.' },
        { status: 404 }
      );
    }

    const wallet = createWallet();
    const fundResult = await fundWallet(wallet.address);
    if (!fundResult.success) {
      return NextResponse.json(
        { error: fundResult.error || 'Failed to fund wallet. Is Hardhat node running?' },
        { status: 500 }
      );
    }

    await registerUserOnChain(wallet.privateKey, role === 'verifier');
    await registerUser(email, wallet.address, wallet.privateKey, role);

    if (role === 'verifier') {
      const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(wallet.address));
      await addVerifier({
        address: wallet.address,
        pubKeyHash,
        name: `Verifier ${wallet.address.slice(0, 8)}...`,
        documentTypes: ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'],
      });
    }

    return NextResponse.json({
      action: 'signup',
      email,
      address: wallet.address,
      privateKey: wallet.privateKey,
      role,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Google authentication failed' },
      { status: 500 }
    );
  }
}
