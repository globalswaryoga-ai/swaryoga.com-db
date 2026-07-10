/**
 * POST /api/admin/crm/whatsapp/qr/send-poll
 *
 * Send a WhatsApp poll to a chat or group via the tenant's QR bridge session.
 * Body: { to: string, name: string, options: string[], selectableCount?: number }
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

    const { to, name, options, selectableCount } = await req.json();
    if (!to || !name) {
      return NextResponse.json({ success: false, error: 'to and name required' }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 12) {
      return NextResponse.json({ success: false, error: 'options must have 2–12 entries' }, { status: 400 });
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
    const result = await callQrBridge(session, userId, '/send-poll', {
      to: chatJid,
      name: String(name),
      options: options.map((o: unknown) => String(o)),
      selectableCount: selectableCount || 1,
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
      text: `📊 Poll: ${name}\n${options.map((o: unknown, i: number) => `${i + 1}. ${o}`).join('\n')}`,
      type: 'poll',
    });

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error('[QR SEND-POLL] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
