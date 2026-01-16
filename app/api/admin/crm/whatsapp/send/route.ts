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

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


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
      // Route based on provider
      let apiResult: any;

      if (providerScope === 'qr') {
        // For QR/WhatsApp Web Bridge: skip Meta and go directly to bridge
        const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
        const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || '').trim();

        if (!bridgeUrl || !bridgeSecret) {
          throw new Error('QR Bridge is not configured (missing WHATSAPP_BRIDGE_HTTP_URL or WHATSAPP_WEB_BRIDGE_SECRET)');
        }

        const bridgeRes = await fetch(`${bridgeUrl}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': bridgeSecret,
          },
          body: JSON.stringify({
            phone: to,
            message: hasText ? String(messageContent) : '(media)',
          }),
          cache: 'no-store',
        });

        const bridgeData = await bridgeRes.json().catch(() => ({}));

        if (!bridgeRes.ok) {
          throw new Error(bridgeData?.error || `QR Bridge error: ${bridgeRes.statusText}`);
        }

        apiResult = { waMessageId: bridgeData?.messageId || 'qr-sent', raw: { ...bridgeData, provider: 'whatsapp_qr' } };
      } else {
        // For Meta: use the shared helper
        apiResult = await sendWhatsAppText(to, hasText ? String(messageContent) : '');
      }

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
            provider: providerScope,
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
            provider: providerScope,
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
