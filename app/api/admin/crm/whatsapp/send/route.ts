import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import { getBunnyLeadByPhone, getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { normalizePhone, sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin && !decoded?.userId) {
      console.log(`[SEND:${requestId}] ❌ Unauthorized`);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent, headerText, footerText, media, senderDisplayName } = body;
    const providerScope = body?.provider === 'qr' ? 'qr' : 'meta';
    const providerValue = providerScope === 'qr' ? 'whatsapp_qr' : 'meta';
    
    const hasMedia = Boolean(media?.url || media?.base64);
    const hasText = Boolean(String(messageContent || '').trim());
    
    if (!phoneNumber || (!hasText && !hasMedia)) {
      return NextResponse.json({ success: false, error: 'Missing phoneNumber or messageContent' }, { status: 400 });
    }

    const userId = decoded?.userId || decoded?.username || 'unknown';
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const normalizedPhone = normalizePhone(String(phoneNumber));

    // Find lead in BunnyDB
    let lead = leadId ? await getBunnyLeadById(leadId, superAdmin ? null : userId) : null;
    if (!lead) {
      lead = await getBunnyLeadByPhone(normalizedPhone, superAdmin ? null : userId);
    }

    if (!superAdmin && !lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    if (lead?.isBlocked) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot send message to a blocked user. Unblock them first.' 
      }, { status: 403 });
    }

    if (!superAdmin && lead) {
      const assignedTo = String(lead.assignedToUserId || '').trim();
      const createdBy = String(lead.createdByUserId || '').trim();
      if (assignedTo && assignedTo !== userId && createdBy !== userId) {
        return NextResponse.json({ 
          success: false, 
          error: `You can only message leads assigned to you or created by you.` 
        }, { status: 403 });
      }
    }

    if (!lead) {
      // Create lead if missing
      lead = await saveBunnyLead({
        phoneNumber: normalizedPhone,
        source: 'manual',
        status: 'lead',
        labels: [],
      });
    }

    const isSuperAdminUser = userId === 'admincrm' || userId === 'admin';
    const adminDisplayName = isSuperAdminUser ? 'Swar Yoga' : (decoded.name || decoded.username || userId);
    const adminNameTag = `\n\n*${adminDisplayName}*`;
    const finalMessageContent = hasText 
      ? String(messageContent).trim() + adminNameTag
      : '(media)';

    let messageRecord: any;
    const documentId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    
    if (providerScope === 'meta') {
      messageRecord = await upsertBunnyMetaMessage({
        documentId: documentId,
        leadId: lead?._id ? String(lead._id) : undefined,
        phoneNumber: normalizedPhone,
        messageContent: finalMessageContent,
        headerText: headerText ? String(headerText) : undefined,
        footerText: footerText ? String(footerText) : undefined,
        senderDisplayName: senderDisplayName ? String(senderDisplayName) : undefined,
        metadata: { channel: providerScope },
        direction: 'outbound',
        status: 'pending',
        sentAt: new Date().toISOString(),
        provider: providerValue,
        sentByLabel: userId,
        sentByUserId: userId,
        ...(media?.url && {
          media: {
            url: media.url,
            kind: media.kind || 'image',
          },
          messageType: 'media',
        }),
      });
    } else {
      // QR provider fallback (usually won't hit since user migrated entirely to Bunny for meta)
      // but keeping it simple and stubbing to avoid mongo
      console.warn("QR provider hit but we are running in BunnyDB-only mode for send.");
      messageRecord = { _id: documentId };
    }

    const messageId = providerScope === 'meta' ? documentId : documentId;

    try {
      let deliveryResult: any;

      if (providerScope === 'qr') {
        const { url: bridgeUrl, secret: bridgeSecret } = getWhatsAppBridgeConfig();
        if (!bridgeUrl) throw new Error('Bridge URL not configured');

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
        if (!bridgeRes.ok) throw new Error(bridgeData?.error || `Bridge error ${bridgeRes.status}`);

        const whatsappMessageId = bridgeData.id || bridgeData.messageId || bridgeData.key?.id || `qr-${Date.now()}`;
        deliveryResult = { waMessageId: whatsappMessageId };
      } else {
        const tenantCreds = (await getMetaCredentialsForTenant(userId)) || undefined;
        if (media?.url) {
          deliveryResult = await sendWhatsAppMedia(
            normalizedPhone,
            media.url,
            media.kind || 'image',
            finalMessageContent,
            tenantCreds
          );
        } else {
          deliveryResult = await sendWhatsAppText(normalizedPhone, finalMessageContent, tenantCreds);
        }
      }

      if (providerScope === 'meta') {
        await updateBunnyMetaMessage(messageId, {
          status: 'sent',
          waMessageId: deliveryResult.waMessageId,
          whatsappMessageId: deliveryResult.waMessageId,
          provider: providerValue,
          deliveredAt: new Date().toISOString(),
          ...(media?.url && {
            media: {
              url: media.url,
              kind: media.kind || 'image'
            }
          })
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId: messageId,
            status: 'sent',
            waMessageId: deliveryResult.waMessageId,
            provider: providerScope,
          },
        },
        { status: 200 }
      );

    } catch (deliveryErr) {
      const errorMsg = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr);

      if (providerScope === 'meta') {
        await updateBunnyMetaMessage(messageId, {
          status: 'failed',
          errorMessage: errorMsg.substring(0, 500),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMsg.substring(0, 200),
          messageId: messageId,
        },
        { status: 502 }
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
