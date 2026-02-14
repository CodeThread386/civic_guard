import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/user-registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'No account found. Please sign up first.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      address: user.address,
      privateKey: user.privateKey,
      role: user.role,
    });
  } catch (error) {
    console.error('Auth lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
