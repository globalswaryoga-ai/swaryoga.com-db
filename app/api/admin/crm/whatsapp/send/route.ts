import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { sendWhatsAppText } from '@/lib/whatsapp';

// NOTE: This route previously had its own Meta + bridge implementations.
// That caused drift vs `lib/whatsapp.ts` (different endpoint + secret headers),
// which can make QR/bridge delivery work for “some numbers” but fail for others.
// We now delegate sending to the shared helper to keep behavior consistent.

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

    // Find or create lead
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

    // Create message record in database (always)
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      messageContent: String(messageContent),
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'pending', // Will be updated based on which provider succeeds
    });

    try {
      const apiResult = await sendWhatsAppText(to, String(messageContent));

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        provider: apiResult?.raw?.provider || 'sent',
        waMessageId: apiResult.waMessageId,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'sent',
            waMessageId: apiResult.waMessageId,
          },
        },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'queued',
        provider: 'none',
        errorMessage: message,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'queued',
            via: 'database',
            warning: message.substring(0, 120),
          },
        },
        { status: 202 }
      );
    }

  } catch (error: any) {
    console.error('[WhatsApp] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
