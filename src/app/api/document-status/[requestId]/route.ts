import { NextRequest, NextResponse } from 'next/server';
import { getRequest } from '@/lib/document-requests';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const req = await getRequest(requestId);

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: req.status,
      documentType: req.documentType,
      ...(req.status === 'approved' && {
        documentContent: req.documentContent,
        formData: req.formData,
      }),
    });
  } catch (error) {
    console.error('Document status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
