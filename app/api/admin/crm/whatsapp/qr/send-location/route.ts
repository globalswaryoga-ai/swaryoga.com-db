/**
 * POST /api/admin/crm/whatsapp/qr/send-location
 *
 * Send a map-pin location to a chat or group via the tenant's QR bridge.
 * Body: { to: string, latitude: number, longitude: number, name?: string, address?: string }
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

    const { to, latitude, longitude, name, address } = await req.json();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!to) {
      return NextResponse.json({ success: false, error: 'to required' }, { status: 400 });
    }
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) {
      return NextResponse.json({ success: false, error: 'Valid latitude and longitude required' }, { status: 400 });
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
    const result = await callQrBridge(session, userId, '/send-location', {
      to: chatJid,
      latitude: lat,
      longitude: lng,
      name: name || '',
      address: address || '',
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
      text: `📍 ${name || 'Location'} (${lat}, ${lng})`,
      type: 'location',
    });

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error('[QR SEND-LOCATION] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
