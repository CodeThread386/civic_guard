import { NextRequest, NextResponse } from 'next/server';
import { fetchDigiLockerAadhaar, isDigiLockerConfigured } from '@/lib/digilocker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    if (!isDigiLockerConfigured()) {
      return NextResponse.json(
        { error: 'DigiLocker not configured. Add DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID to .env.local' },
        { status: 503 }
      );
    }

    const { fileUrl, aadhaarData } = await fetchDigiLockerAadhaar(id);
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error('Failed to download Aadhaar file');
    const arrayBuffer = await fileRes.arrayBuffer();
    const documentContent = Buffer.from(arrayBuffer).toString('base64');

    const formData: Record<string, string> = {};
    if (aadhaarData.aadhaar?.dateOfBirth) formData['Date of Birth'] = aadhaarData.aadhaar.dateOfBirth;
    if (aadhaarData.aadhaar?.name) formData['Full Name'] = aadhaarData.aadhaar.name;

    return NextResponse.json({
      documentContent,
      documentType: 'Aadhar',
      formData,
      aadhaarData,
    });
  } catch (error) {
    console.error('DigiLocker fetch Aadhaar error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Aadhaar' },
      { status: 500 }
    );
  }
}
