import { NextRequest, NextResponse } from 'next/server';
import { getDigiLockerStatus, isDigiLockerConfigured } from '@/lib/digilocker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    if (!isDigiLockerConfigured()) {
      return NextResponse.json(
        { error: 'DigiLocker not configured. Add DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID to .env.local' },
        { status: 503 }
      );
    }

    const result = await getDigiLockerStatus(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('DigiLocker status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
