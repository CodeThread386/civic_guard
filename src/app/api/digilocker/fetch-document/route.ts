import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDigiLockerDocument,
  isDigiLockerConfigured,
  DIGILOCKER_ORG_IDS,
} from '@/lib/digilocker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, docType, orgId, format, parameters } = body;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    if (!docType || typeof docType !== 'string') {
      return NextResponse.json({ error: 'docType required' }, { status: 400 });
    }

    const resolvedOrgId = orgId || DIGILOCKER_ORG_IDS[docType] || 'default';
    const resolvedFormat = format || 'pdf';
    const resolvedParams = Array.isArray(parameters) ? parameters : [];

    if (!isDigiLockerConfigured()) {
      return NextResponse.json(
        { error: 'DigiLocker not configured. Add DIGILOCKER_CLIENT_ID, DIGILOCKER_CLIENT_SECRET, DIGILOCKER_PRODUCT_INSTANCE_ID to .env.local' },
        { status: 503 }
      );
    }

    const { fileUrl } = await fetchDigiLockerDocument(
      id,
      docType,
      resolvedOrgId,
      resolvedFormat,
      resolvedParams
    );
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error('Failed to download document');
    const arrayBuffer = await fileRes.arrayBuffer();
    const documentContent = Buffer.from(arrayBuffer).toString('base64');

    const formData: Record<string, string> = {};
    resolvedParams.forEach((p: { name: string; value: string }) => {
      if (p.name && p.value) formData[p.name] = p.value;
    });

    return NextResponse.json({
      documentContent,
      documentType: docType,
      formData,
    });
  } catch (error) {
    console.error('DigiLocker fetch document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch document' },
      { status: 500 }
    );
  }
}
