import { NextResponse } from 'next/server';
import { getVerifiers } from '@/lib/verifiers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const verifiers = await getVerifiers();
    return NextResponse.json({ verifiers });
  } catch (error) {
    console.error('Verifiers error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
