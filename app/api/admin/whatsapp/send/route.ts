import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ConsentManager } from '@/lib/consentManager';
import { AuditLogger } from '@/lib/auditLogger';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function looksLikeObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const webBridgeDisabled =
      String(process.env.WHATSAPP_DISABLE_WEB_BRIDGE || '').trim().toLowerCase() === 'true';
    const cloudConfigured = Boolean(
      String(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_BUSINESS_TOKEN || '').trim() &&
        String(process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_PHONE_NUMBER || '').trim()
    );

    // This endpoint historically powered the WhatsApp Web (QR) inbox.
    // If bridge is disabled and Cloud isn't configured, fail fast with a clear status.
    if (webBridgeDisabled && !cloudConfigured) {
      return NextResponse.json(
        { error: 'WhatsApp Web bridge is disabled and WhatsApp Cloud API is not configured' },
        { status: 410 }
      );
    }

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const leadId = body?.leadId ? String(body.leadId) : undefined;
    const rawPhone = body?.phoneNumber ? String(body.phoneNumber) : undefined;
    const message = String(body?.message || '').trim();
    const dryRun = Boolean(body?.dryRun);

    if (!message) {
      return NextResponse.json({ error: 'Missing: message' }, { status: 400 });
    }

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    let lead: any = null;
    if (leadId) {
      lead = await Lead.findById(leadId).lean();
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
    }

    const to = normalizePhone(rawPhone || lead?.phoneNumber);
    if (!to) {
      return NextResponse.json({ error: 'Missing: phoneNumber (or leadId with phoneNumber)' }, { status: 400 });
    }

    // Consent / opt-out compliance
    const compliance = await ConsentManager.validateCompliance(to);
    if (!compliance.compliant) {
      return NextResponse.json(
        { error: compliance.reason || 'User has opted out or is blocked' },
        { status: 403 }
      );
    }

    // If no lead record exists, create one (so we can thread messages).
    if (!lead) {
      lead = await Lead.findOneAndUpdate(
        { phoneNumber: to },
        {
          $setOnInsert: {
            phoneNumber: to,
            source: 'manual',
            status: 'lead',
          },
          $set: { lastMessageAt: new Date() },
        },
        { upsert: true, new: true }
      ).lean();
    }

    const now = new Date();
    const msgDoc = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      direction: 'outbound',
      messageType: 'text',
      messageContent: message,
      status: 'queued',
      provider: 'meta', // Set this early so it shows in CRM lists
      sentBy: decoded?.userId || undefined,
      sentByLabel: decoded?.username || 'admin',
      sentAt: now,
      metadata: {
        dryRun,
      },
    });

    if (dryRun) {
      return NextResponse.json(
        {
          success: true,
          dryRun: true,
          data: {
            messageId: String(msgDoc._id),
            to,
          },
        },
        { status: 200 }
      );
    }

    const apiResult = await sendWhatsAppText(to, message);
    const waMessageId = apiResult.waMessageId;

    await WhatsAppMessage.updateOne(
      { _id: msgDoc._id },
      {
        $set: {
          status: 'sent',
          waMessageId,
          provider: 'meta',
          updatedAt: new Date(),
        },
      }
    );

    await Lead.updateOne(
      { _id: lead._id },
      { $set: { lastMessageAt: now, updatedAt: now } }
    );

    if (looksLikeObjectId(decoded?.userId)) {
      await AuditLogger.log({
        userId: decoded.userId,
        actionType: 'message_send',
        resourceType: 'whatsapp_message',
        resourceId: String(msgDoc._id),
        description: `Sent WhatsApp message to ${to}`,
        metadata: { to, waMessageId },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          messageId: String(msgDoc._id),
          waMessageId,
          to,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
