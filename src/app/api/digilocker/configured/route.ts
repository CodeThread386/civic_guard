import { NextResponse } from 'next/server';
import { isDigiLockerConfigured } from '@/lib/digilocker';

export async function GET() {
  return NextResponse.json({ configured: isDigiLockerConfigured() });
}
