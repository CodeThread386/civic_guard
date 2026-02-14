import { NextRequest, NextResponse } from 'next/server';
import { createShareSession } from '@/lib/share-sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, docTypes, metadata } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address required' }, { status: 400 });
    }
    if (!Array.isArray(docTypes) || docTypes.length === 0) {
      return NextResponse.json({ error: 'docTypes required (non-empty array)' }, { status: 400 });
    }

    const meta = metadata && typeof metadata === 'object' ? metadata : {};
    const shortId = await createShareSession(address, docTypes, meta);

    return NextResponse.json({ shortId, expiresIn: 600 });
  } catch (error) {
    console.error('Share create error:', error);
    return NextResponse.json({ error: 'Failed to create share session' }, { status: 500 });
  }
}
