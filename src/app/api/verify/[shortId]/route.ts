import { NextRequest, NextResponse } from 'next/server';
import { getShareSession } from '@/lib/share-sessions';
import { getUserDocumentTypes } from '@/lib/blockchain';
import { ethers } from 'ethers';
import { isOver18, isNotExpired, getAge } from '@/lib/verify-utils';
import type { VerifyDocResult, VerifyResult } from '@/types/verify';

export type { VerifyDocResult, VerifyResult };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const { shortId } = await params;
    const { searchParams } = new URL(request.url);
    const docTypesFilter = searchParams.get('docTypes'); // comma-separated
    const requireAge18 = searchParams.get('age18') === 'true';
    const requireNotExpired = searchParams.get('notExpired') === 'true';

    const session = await getShareSession(shortId);
    if (!session) {
      return NextResponse.json(
        { valid: false, error: 'Share session expired or not found' },
        { status: 404 }
      );
    }

    const requestedDocTypes = docTypesFilter
      ? docTypesFilter.split(',').map((s) => s.trim()).filter(Boolean)
      : session.docTypes;

    if (requestedDocTypes.length === 0) {
      return NextResponse.json({
        valid: true,
        address: session.address,
        docTypes: session.docTypes,
        results: session.docTypes.map((dt) => ({
          documentType: dt,
          onChain: false,
          metadata: session.metadata[dt],
        })),
      } satisfies VerifyResult);
    }

    const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(session.address));
    let chainDocTypes: string[] = [];
    try {
      chainDocTypes = await getUserDocumentTypes(pubKeyHash);
      if (!Array.isArray(chainDocTypes)) chainDocTypes = [];
    } catch (e) {
      console.error('Blockchain lookup error:', e);
    }

    const results: VerifyDocResult[] = requestedDocTypes.map((docType) => {
      const onChain = chainDocTypes.includes(docType);
      const meta = session.metadata[docType] || {};
      const result: VerifyDocResult = {
        documentType: docType,
        onChain,
        metadata: Object.keys(meta).length > 0 ? meta : undefined,
      };

      if (requireAge18 && meta.dob) {
        const passed = isOver18(meta.dob);
        result.ageCheck = {
          required: true,
          passed,
          age: passed !== null && meta.dob ? getAge(meta.dob) ?? undefined : undefined,
        };
      } else if (requireAge18 && !meta.dob) {
        result.ageCheck = { required: true, passed: null };
      }

      if (requireNotExpired && meta.expiry) {
        result.expiryCheck = {
          required: true,
          passed: isNotExpired(meta.expiry),
        };
      } else if (requireNotExpired && !meta.expiry) {
        result.expiryCheck = { required: true, passed: null };
      }

      return result;
    });

    const valid =
      results.every((r) => r.onChain) &&
      results.every((r) => {
        if (r.ageCheck?.required && r.ageCheck.passed === false) return false;
        if (r.expiryCheck?.required && r.expiryCheck.passed === false) return false;
        return true;
      });

    return NextResponse.json({
      valid,
      address: session.address,
      docTypes: session.docTypes,
      results,
    } satisfies VerifyResult);
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
