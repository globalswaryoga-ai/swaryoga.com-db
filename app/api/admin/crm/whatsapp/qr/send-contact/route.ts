/**
 * POST /api/admin/crm/whatsapp/qr/send-contact
 *
 * Send a tappable contact card (vCard) to a chat or group via the tenant's
 * QR bridge session.
 * Body: { to: string, contactName: string, contactPhone: string, organization?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { resolveQrBridgeSession, callQrBridge, normalizeChatJid, logQrOutboundMessage } from '@/lib/qrSpecialSend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { to, contactName, contactPhone, organization } = await req.json();
    if (!to || !contactName || !contactPhone) {
      return NextResponse.json({ success: false, error: 'to, contactName and contactPhone required' }, { status: 400 });
    }

    const userId = getViewerUserId(decoded);
    const session = await resolveQrBridgeSession(userId);
    if (!session.hasOwnBridge) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Every QR user needs an isolated WhatsApp session.' },
        { status: 403 }
      );
    }

    const chatJid = normalizeChatJid(String(to));
    const result = await callQrBridge(session, userId, '/send-contact', {
      to: chatJid,
      contactName: String(contactName),
      contactPhone: String(contactPhone),
      organization: organization || '',
    });

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

    const messageId = result.data.messageId || '';
    await logQrOutboundMessage({
      userId,
      session,
      chatJid,
      messageId,
      text: `👤 Contact: ${contactName} (+${String(contactPhone).replace(/\D/g, '')})`,
      type: 'contact',
    });

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error('[QR SEND-CONTACT] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
