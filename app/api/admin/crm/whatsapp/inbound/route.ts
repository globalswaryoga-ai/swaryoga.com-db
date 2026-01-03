import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

/**
 * Inbound WhatsApp Web bridge -> CRM ingestion endpoint.
 *
 * Security model:
 * - This is NOT a public endpoint.
 * - The local WhatsApp Web bridge (services/whatsapp-web/qrServer.js) calls it.
 * - Auth uses a shared secret header: X-WhatsApp-Bridge-Secret.
 *
 * Required env:
 * - WHATSAPP_WEB_BRIDGE_SECRET
 */

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.WHATSAPP_WEB_BRIDGE_SECRET;
    if (!expected) {
      return NextResponse.json({ error: 'WHATSAPP_WEB_BRIDGE_SECRET is not set' }, { status: 500 });
    }

    const secret = request.headers.get('x-whatsapp-bridge-secret');
    if (!secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const fromRaw = body.from;
    const text = body.body;
    const ts = body.timestamp;
    const waMessageId = body.waMessageId;

    const from = normalizePhone(String(fromRaw || ''));
    if (!from) {
      return NextResponse.json({ error: 'Missing/invalid: from' }, { status: 400 });
    }

    await connectDB();

    // Find lead by phoneNumber; create if missing.
    let lead = await Lead.findOne({ phoneNumber: from });
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: from,
        source: 'whatsapp',
        status: 'lead',
        labels: [],
        lastMessageAt: new Date(),
      });
    }

    // Idempotency guard: if this inbound WhatsApp messageId already exists, skip.
    if (waMessageId) {
      const existing = await WhatsAppMessage.findOne({ waMessageId: String(waMessageId) }).select('_id').lean();
      if (existing) {
        return NextResponse.json({ success: true, data: { skipped: true, reason: 'duplicate_waMessageId' } });
      }
    }

    const sentAt = ts ? new Date(Number(ts) * 1000) : new Date();

    const msgDoc = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: from,
      direction: 'inbound',
      messageType: 'text',
      messageContent: typeof text === 'string' ? text : JSON.stringify(text ?? ''),
      status: 'delivered',
      waMessageId: waMessageId ? String(waMessageId) : undefined,
      sentAt,
      metadata: {
        source: 'whatsapp_web_bridge',
      },
    });

    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          lastMessageAt: sentAt,
        },
      }
    );

    return NextResponse.json({ success: true, data: { leadId: String(lead._id), messageId: String(msgDoc._id) } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[whatsapp-inbound] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
