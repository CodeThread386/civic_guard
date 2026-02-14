import { NextRequest, NextResponse } from 'next/server';
import { getPendingForVerifier } from '@/lib/document-requests';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verifierPubKeyHash = searchParams.get('verifierPubKeyHash');
    if (!verifierPubKeyHash) {
      return NextResponse.json({ error: 'verifierPubKeyHash required' }, { status: 400 });
    }
    const pending = await getPendingForVerifier(verifierPubKeyHash);
    return NextResponse.json({ requests: pending });
  } catch (error) {
    console.error('Document pending error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
