import { NextRequest, NextResponse } from 'next/server';
import { addVerifier } from '@/lib/verifiers';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name, documentTypes } = body;

    if (!address || !name) {
      return NextResponse.json({ error: 'address and name required' }, { status: 400 });
    }

    const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(address));
    await addVerifier({
      address,
      pubKeyHash,
      name,
      documentTypes: Array.isArray(documentTypes) ? documentTypes : ['Aadhar', 'PAN', 'Degree', 'Passport', 'Driving License'],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verifier register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
