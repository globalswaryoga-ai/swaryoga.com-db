export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppBridgeSecret } from '@/lib/whatsappBridgeConfig';
import { applyQrStatusUpdate } from '@/lib/qrStatusUpdates';

/**
 * ACK Webhook - receives message delivery/read status updates from bridge
 * ack values: 0=pending, 1=sent, 2=delivered, 3=read, 4=played
 */

const BRIDGE_SECRET = getWhatsAppBridgeSecret();

export async function POST(req: NextRequest) {
  try {
    // Verify bridge secret
    const secret = req.headers.get('x-bridge-secret') || '';
    if (secret !== BRIDGE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, ack, status } = body;

    if (!messageId) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_messageId' });
    }

    // Legacy whatsapp-web.js ACKs are 0..4; convert them to Baileys 1..5.
    const receiptStatus = status || (typeof ack === 'number' ? ack + 1 : ack);
    const result = await applyQrStatusUpdate(
      { messageId, status: receiptStatus },
      req.headers.get('x-user-id') || undefined
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[ACK ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
