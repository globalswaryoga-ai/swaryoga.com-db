import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

/**
 * ACK Webhook - receives message delivery/read status updates from bridge
 * ack values: 0=pending, 1=sent, 2=delivered, 3=read, 4=played
 */

const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Map ack numbers to status strings
const ACK_TO_STATUS: Record<number, string> = {
  0: 'pending',
  1: 'sent',
  2: 'delivered',
  3: 'read',
  4: 'played', // for audio/video
};

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

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    // Find message by WhatsApp message ID
    const message = await WhatsAppMessage.findOne({ waMessageId: messageId });
    
    if (!message) {
      // Message not found - might be from before we started tracking
      return NextResponse.json({ success: true, skipped: true, reason: 'message_not_found' });
    }

    // Only update if new status is "higher" (more confirmed)
    const currentStatus = message.status;
    const newStatus = ACK_TO_STATUS[ack] || status || 'unknown';
    
    // Status progression: pending -> sent -> delivered -> read
    const statusOrder = ['pending', 'sent', 'delivered', 'read', 'played'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    
    if (newIndex > currentIndex) {
      await WhatsAppMessage.updateOne(
        { _id: message._id },
        { status: newStatus }
      );
      console.log('[ACK] Updated', messageId, 'to', newStatus);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    console.error('[ACK ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
