import { NextRequest, NextResponse } from 'next/server';
import { recordAvatarConsent } from '@/lib/avatarEngine/consentService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, avatarName, authorizedBy, declarationText } = body;

    if (!userId || !avatarName || !authorizedBy || !declarationText) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, avatarName, authorizedBy, declarationText' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    const consentRecord = await recordAvatarConsent({
      userId,
      avatarName,
      authorizedBy,
      declarationText,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      consent: consentRecord,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Consent recording failed' },
      { status: 500 }
    );
  }
}

