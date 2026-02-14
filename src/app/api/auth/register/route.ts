import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/user-registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, address, privateKey, role } = body;

    if (!email || !address || !privateKey || !role) {
      return NextResponse.json(
        { error: 'Missing: email, address, privateKey, role' },
        { status: 400 }
      );
    }

    await registerUser(email, address, privateKey, role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
