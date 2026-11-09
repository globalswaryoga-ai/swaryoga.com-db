import { NextRequest, NextResponse } from 'next/server';
import { getViewerUserId } from '@/lib/crm-handlers';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { recordAvatarConsent } from '@/lib/avatarEngine/consentService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(req));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const userId = getViewerUserId(decoded);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Admin user identity is missing.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { avatarName, declarationText } = body;

    if (typeof avatarName !== 'string' || !avatarName.trim() ||
      typeof declarationText !== 'string' || !declarationText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Avatar name and explicit consent declaration are required.' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    const consentRecord = await recordAvatarConsent({
      userId,
      avatarName: avatarName.trim(),
      authorizedBy: decoded.name || decoded.email || userId,
      declarationText: declarationText.trim(),
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
