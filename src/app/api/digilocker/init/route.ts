import { NextRequest, NextResponse } from 'next/server';
import { initDigiLockerSession, isDigiLockerConfigured } from '@/lib/digilocker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const redirectUrl = body.redirectUrl;
    if (!redirectUrl || typeof redirectUrl !== 'string') {
      return NextResponse.json({ error: 'redirectUrl required' }, { status: 400 });
    }

    if (!isDigiLockerConfigured()) {
      return NextResponse.json(
        {
          error: 'DigiLocker not configured. Add DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID to .env.local',
        },
        { status: 503 }
      );
    }

    const result = await initDigiLockerSession(redirectUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('DigiLocker init error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to init DigiLocker' },
      { status: 500 }
    );
  }
}
