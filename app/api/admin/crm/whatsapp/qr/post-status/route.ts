/**
 * POST /api/admin/crm/whatsapp/qr/post-status
 *
 * Post a WhatsApp Status (story) from the tenant's connected number.
 * Visible to every individual contact the session knows about.
 * Body: { text?: string, imageUrl?: string, caption?: string, backgroundColor?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { resolveQrBridgeSession, callQrBridge } from '@/lib/qrSpecialSend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { text, imageUrl, caption, backgroundColor } = await req.json();
    if (!text && !imageUrl) {
      return NextResponse.json({ success: false, error: 'text or imageUrl required' }, { status: 400 });
    }

    const userId = getViewerUserId(decoded);
    const session = await resolveQrBridgeSession(userId);
    if (!session.hasOwnBridge) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Every QR user needs an isolated WhatsApp session.' },
        { status: 403 }
      );
    }

    const result = await callQrBridge(session, userId, '/post-status', {
      text: text || '',
      imageUrl: imageUrl || '',
      caption: caption || '',
      backgroundColor: backgroundColor || '',
    }, 20000);

    if (result.status === 503) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp QR not connected. Please scan QR code first.', needsQr: true },
        { status: 200 }
      );
    }
    if (!result.ok || !result.data?.success) {
      return NextResponse.json(
        { success: false, error: result.data?.error || `Bridge returned ${result.status}` },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.data.messageId || '',
      audienceSize: result.data.audienceSize || 0,
    });
  } catch (err: any) {
    console.error('[QR POST-STATUS] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
