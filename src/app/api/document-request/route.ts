import { NextRequest, NextResponse } from 'next/server';
import { createRequest } from '@/lib/document-requests';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userAddress, verifierPubKeyHash, documentType, formData } = body;

    if (!userEmail || !userAddress || !verifierPubKeyHash || !documentType || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail, userAddress, verifierPubKeyHash, documentType, formData' },
        { status: 400 }
      );
    }

    const id = await createRequest(
      userEmail,
      userAddress,
      verifierPubKeyHash,
      documentType,
      formData
    );

    return NextResponse.json({ success: true, requestId: id });
  } catch (error) {
    console.error('Document request error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
