import { NextRequest, NextResponse } from 'next/server';
import { getApprovedForUser } from '@/lib/document-requests';

export const dynamic = 'force-dynamic';

const ETH_ADDRESS_LENGTH = 42; // 0x + 40 hex chars

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address || typeof address !== 'string' || address.length < ETH_ADDRESS_LENGTH) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }
    const requests = await getApprovedForUser(address);
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        documentType: r.documentType,
        verifierPubKeyHash: r.verifierPubKeyHash,
        formData: r.formData || {},
        documentContent: r.documentContent,
      })),
    });
  } catch (error) {
    console.error('Document approved for user error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
