import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

// WhatsApp Bridge URL - used to send messages via whatsapp-web.js
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { leadId, phoneNumber, messageContent } = body;
    if (!phoneNumber || !messageContent) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectDB();

    let lead = leadId ? await Lead.findById(leadId) : null;
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: normalizePhone(String(phoneNumber)) });
    }
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: normalizePhone(String(phoneNumber)),
        source: 'crm',
        status: 'lead',
        labels: [],
      });
    }

    const to = normalizePhone(String(phoneNumber));
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      messageContent: String(messageContent),
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
    });

    try {
      const res = await fetch(`${BRIDGE_URL}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: to, message: messageContent }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, { status: 'sent' });
        return NextResponse.json({
          success: true,
          data: { messageId: messageRecord._id, status: 'sent', via: 'bridge' },
        });
      } else {
        return NextResponse.json({
          success: true,
          data: { messageId: messageRecord._id, status: 'queued', warning: 'Bridge unavailable' },
        }, { status: 202 });
      }
    } catch (err: any) {
      return NextResponse.json({
        success: true,
        data: { messageId: messageRecord._id, status: 'queued', warning: 'Bridge offline' },
      }, { status: 202 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
