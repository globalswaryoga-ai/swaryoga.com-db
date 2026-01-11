import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

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

    const { leadId, phoneNumber, messageContent, headerText, footerText, media, senderDisplayName } = body;
    const providerScope = body?.provider === 'qr' ? 'qr' : 'meta';
    const providerValue = providerScope === 'qr' ? 'whatsapp_qr' : 'meta';
    const hasMedia = Boolean(media?.base64);
    const hasText = Boolean(String(messageContent || '').trim());
    if (!phoneNumber || (!hasText && !hasMedia)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectDB();

    const superAdmin = decoded?.userId === 'admincrm' || decoded?.userId === 'admin';

    // Find lead by id or by phone.
    let lead = leadId ? await Lead.findById(leadId) : null;
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: normalizePhone(String(phoneNumber)) });
    }

    // Access control:
    // - Super admins (admincrm, admin) can send to any lead + create placeholder leads.
    // - Other admins can only send to leads assigned to them.
    // - Non-super-admin cannot create a new lead by sending a message.
    if (!superAdmin) {
      if (!lead) {
        return NextResponse.json(
          { error: 'Lead not found (cannot create lead via send)' },
          { status: 404 }
        );
      }
      const assignedTo = String((lead as any).assignedToUserId || '').trim();
      if (!assignedTo || assignedTo !== decoded?.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!lead) {
      // Super admin fallback: create placeholder lead
      lead = await Lead.create({
        phoneNumber: normalizePhone(String(phoneNumber)),
        source: 'crm',
        status: 'lead',
        labels: [],
      });
    } else {
      lead = await Lead.findByIdAndUpdate(lead._id, {
        phoneNumber: normalizePhone(String(phoneNumber)),
      });
    }

    const to = normalizePhone(String(phoneNumber));

    const mergedMetadata = {
      ...(typeof body?.metadata === 'object' && body.metadata ? body.metadata : {}),
      ...(media
        ? {
            media: {
              kind: String(media?.kind || ''),
              fileName: String(media?.fileName || ''),
              mimeType: String(media?.mimeType || ''),
              sizeBytes: Number(media?.sizeBytes || 0),
              hasBase64: Boolean(media?.base64),
            },
          }
        : {}),
      channel: providerScope === 'qr' ? 'qr' : 'meta',
    };

    // Create message record in database (always)
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      // Keep messageContent non-empty in Mongo even if this is a media-only send.
      messageContent: hasText ? String(messageContent) : '(media)',
      headerText: headerText != null ? String(headerText) : undefined,
      footerText: footerText != null ? String(footerText) : undefined,
      senderDisplayName: senderDisplayName != null ? String(senderDisplayName) : undefined,
      // We avoid persisting base64 blobs in Mongo for now; keep a small summary.
      metadata: mergedMetadata,
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: providerValue,
    });

    try {
      // Current shared helper sends text. For media-only sends we still enqueue + store,
      // and attempt to send a blank/placeholder text to avoid hard failure.
      const apiResult = await sendWhatsAppText(to, hasText ? String(messageContent) : '');

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        provider: providerValue,
        senderNumber: '9779006820',
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
