import { NextRequest, NextResponse } from 'next/server';
import { otpGet, otpDelete } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const stored = await otpGet(normalizedEmail);

    if (!stored) {
      return NextResponse.json({ error: 'OTP not found or expired' }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      await otpDelete(normalizedEmail);
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
    }

    if (stored.otp !== otp.toString()) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    await otpDelete(normalizedEmail);
    return NextResponse.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
