import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone, sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/whatsapp/send
 * 
 * Sends a WhatsApp message to a lead contact with detailed logging and error handling.
 * Routes to either QR Bridge or Meta API based on provider parameter.
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      console.log(`[SEND:${requestId}] ❌ Unauthorized`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      console.log(`[SEND:${requestId}] ❌ Invalid JSON`);
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent, headerText, footerText, media, senderDisplayName } = body;
    const providerScope = body?.provider === 'qr' ? 'qr' : 'meta';
    const providerValue = providerScope === 'qr' ? 'whatsapp_qr' : 'meta';
    
    const hasMedia = Boolean(media?.base64);
    const hasText = Boolean(String(messageContent || '').trim());
    
    if (!phoneNumber || (!hasText && !hasMedia)) {
      console.log(`[SEND:${requestId}] ❌ Missing fields`);
      return NextResponse.json({ success: false, error: 'Missing phoneNumber or messageContent' }, { status: 400 });
    }

    console.log(`[SEND:${requestId}] 📨 Message to ${phoneNumber} (${providerScope})`);

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    const userId = decoded?.userId || decoded?.username || 'unknown';
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const normalizedPhone = normalizePhone(String(phoneNumber));

    // Find or create lead
    let lead = leadId ? await Lead.findById(leadId) : null;
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: normalizedPhone });
    }

    if (!superAdmin && !lead) {
      console.log(`[SEND:${requestId}] ❌ Lead not found`);
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // ACCESS CONTROL: Check if regular admin is assigned to this lead
    if (!superAdmin && lead) {
      const assignedTo = String(lead.assignedToUserId || '').trim();
      if (assignedTo && assignedTo !== userId) {
        console.log(`[SEND:${requestId}] ❌ Forbidden: Lead assigned to ${assignedTo}, not ${userId}`);
        return NextResponse.json({ 
          success: false, 
          error: `You can only message leads assigned to you. This lead is assigned to ${assignedTo || 'unassigned'}` 
        }, { status: 403 });
      }
    }

    if (!lead) {
      console.log(`[SEND:${requestId}] 📝 Creating lead (super admin)`);
      lead = await Lead.create({
        phoneNumber: normalizedPhone,
        source: 'crm',
        status: 'lead',
        labels: [],
      });
    }

    // Add admin name to message content
    const adminNameTag = ` [${userId}]`;
    const finalMessageContent = hasText 
      ? String(messageContent).trim() + adminNameTag
      : '(media)';

    // Create message record
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: normalizedPhone,
      messageContent: finalMessageContent,
      headerText: headerText ? String(headerText) : undefined,
      footerText: footerText ? String(footerText) : undefined,
      senderDisplayName: senderDisplayName ? String(senderDisplayName) : undefined,
      metadata: { channel: providerScope },
      direction: 'outbound',
      status: 'pending',
      sentAt: new Date(),
      provider: providerValue,
      sentByLabel: userId,
      sentByUserId: userId,
      // Save media info immediately so it's visible in UI even if pending
      ...(media?.url && {
        media: {
          url: media.url,
          kind: media.kind || 'image',
        },
        messageType: 'media',
      }),
    });

    console.log(`[SEND:${requestId}] 💾 Message created: ${messageRecord._id}`);

    try {
      let deliveryResult: any;

      if (providerScope === 'qr') {
        console.log(`[SEND:${requestId}] 🌉 Sending via QR Bridge to ${normalizedPhone}`);
        const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333').trim();
        const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024').trim();

        if (!bridgeUrl) {
          throw new Error('Bridge URL not configured');
        }

        console.log(`[SEND:${requestId}] 🔗 Bridge URL: ${bridgeUrl}`);

        const bridgePayload: any = {
          to: normalizedPhone,
          message: hasText ? String(messageContent) : '',
          type: media?.url ? 'media' : 'text',
        };

        if (media?.url) {
          bridgePayload.media = media.url;
          bridgePayload.caption = String(messageContent || '').trim();
        }

        const bridgeRes = await fetch(`${bridgeUrl}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bridge-secret': bridgeSecret,
          },
          body: JSON.stringify(bridgePayload),
          cache: 'no-store',
        });

        const bridgeData = await bridgeRes.json().catch(() => ({}));

        if (!bridgeRes.ok) {
          console.error(`[SEND:${requestId}] ❌ Bridge error:`, bridgeData);
          throw new Error(bridgeData?.error || `Bridge error ${bridgeRes.status}`);
        }

        console.log(`[SEND:${requestId}] ✅ Bridge accepted message, queue size: ${bridgeData?.queueSize}`);
        // Extract actual WhatsApp message ID from bridge response
        const whatsappMessageId = bridgeData.id || bridgeData.messageId || bridgeData.key?.id || `qr-${Date.now()}`;
        deliveryResult = { waMessageId: whatsappMessageId };
      } else {
        console.log(`[SEND:${requestId}] 🌐 Sending via Meta API`);
        if (media?.url) {
          console.log(`[SEND:${requestId}] 🖼 Sending media via Meta API:`, media.url);
          deliveryResult = await sendWhatsAppMedia(
            normalizedPhone, 
            media.url, 
            media.kind || 'image', 
            finalMessageContent // Use the version with the admin tag
          );
        } else {
          deliveryResult = await sendWhatsAppText(normalizedPhone, finalMessageContent); // Use the version with the admin tag
        }
      }

      // Mark as sent
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'sent',
        waMessageId: deliveryResult.waMessageId,
        whatsappMessageId: deliveryResult.waMessageId,
        provider: providerValue,
        deliveredAt: new Date(),
        // Save media info if sent via Meta
        ...(media?.url && {
          media: {
            url: media.url,
            kind: media.kind || 'image'
          }
        })
      });

      console.log(`[SEND:${requestId}] ✅ Sent successfully`);

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'sent',
            waMessageId: deliveryResult.waMessageId,
            provider: providerScope,
          },
        },
        { status: 200 }
      );

    } catch (deliveryErr) {
      const errorMsg = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr);
      console.log(`[SEND:${requestId}] ⚠️  Delivery error: ${errorMsg}`);

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'pending',
        errorMessage: errorMsg.substring(0, 500),
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageRecord._id,
            status: 'pending',
            error: errorMsg.substring(0, 120),
          },
        },
        { status: 202 }
      );
    }

  } catch (error: any) {
    console.error(`[SEND] Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}
