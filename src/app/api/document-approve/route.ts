import { NextRequest, NextResponse } from 'next/server';
import { getRequest, approveRequest, rejectRequest } from '@/lib/document-requests';
import { ethers } from 'ethers';

function verifyIssuerSignature(
  requestId: string,
  action: string,
  signature: string,
  issuerAddress: string
): boolean {
  try {
    const message = `CivicGuard: ${action} request ${requestId}`;
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === issuerAddress.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    let requestId: string;
    let action: string;
    let issuerAddress: string;
    let signature: string;
    let documentContent: string | null = null;

    if (isFormData) {
      const formData = await request.formData();
      requestId = formData.get('requestId') as string;
      action = formData.get('action') as string;
      issuerAddress = formData.get('issuerAddress') as string;
      signature = formData.get('signature') as string;
      const file = formData.get('document') as File;
      if (file && file.size > 0) {
        const buf = await file.arrayBuffer();
        documentContent = Buffer.from(buf).toString('base64');
      }
    } else {
      const body = await request.json();
      requestId = body.requestId;
      action = body.action;
      issuerAddress = body.verifierAddress || body.issuerAddress;
      signature = body.signature;
    }

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId and action' }, { status: 400 });
    }

    const req = await getRequest(requestId);
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'approve' || action === 'reject') {
      if (!issuerAddress || !signature) {
        return NextResponse.json({ error: 'Issuer signature required' }, { status: 400 });
      }
      const issuerPubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(issuerAddress));
      if (issuerPubKeyHash !== req.verifierPubKeyHash) {
        return NextResponse.json({ error: 'Issuer mismatch' }, { status: 403 });
      }
      if (!verifyIssuerSignature(requestId, action, signature, issuerAddress)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    if (action === 'approve') {
      if (!documentContent) {
        return NextResponse.json(
          { error: 'Document file required. Issuer must upload the verified document when approving.' },
          { status: 400 }
        );
      }
      await approveRequest(requestId, documentContent);
      return NextResponse.json({ success: true, message: 'Document approved' });
    }

    if (action === 'reject') {
      await rejectRequest(requestId);
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Document approve error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
