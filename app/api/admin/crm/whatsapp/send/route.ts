import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage, updateBunnyMetaMessagesMany } from '@/lib/bunnyMetaWhatsAppRepository';
import { getBunnyLeadByPhone, getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { normalizePhone, sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).slice(2, 9);
  
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username && !decoded.role)) {
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

    const userId = decoded?.userId || decoded?.username || 'admincrm';
    const superAdmin = isSuperAdmin(decoded);
    const normalizedPhone = normalizePhone(String(phoneNumber));

    const isSuperAdminUser = userId === 'admincrm' || userId === 'admin' || superAdmin;
    const adminDisplayName = isSuperAdminUser ? 'Swar Yoga' : (decoded.name || decoded.username || userId);
    const adminNameTag = `\n\n*${adminDisplayName}*`;
    const finalMessageContent = hasText 
      ? String(messageContent).trim() + adminNameTag
      : '(media)';

    const documentId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    // Asynchronously resolve or auto-create lead in BunnyDB (non-blocking)
    const leadPromise = (async () => {
      try {
        let l = leadId ? await getBunnyLeadById(leadId).catch(() => null) : null;
        if (!l) {
          l = await getBunnyLeadByPhone(normalizedPhone, null).catch(() => null);
        }
        if (!l) {
          l = await saveBunnyLead({
            phoneNumber: normalizedPhone,
            source: 'whatsapp_manual',
            status: 'lead',
            labels: [],
            assignedToUserId: userId,
            createdByUserId: userId,
          }).catch(() => null);
        }
        return l;
      } catch {
        return null;
      }
    })();

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
        // Fast path for platform admins: avoid extra DB tenant lookups
        const tenantCreds = isSuperAdminUser ? undefined : ((await getMetaCredentialsForTenant(userId)) || undefined);
        
        if (media?.url) {
          deliveryResult = await sendWhatsAppMedia(
            normalizedPhone,
            media.url,
            media.kind || 'image',
            finalMessageContent,
            tenantCreds,
            media.fileName
          );
        } else {
          deliveryResult = await sendWhatsAppText(normalizedPhone, finalMessageContent, tenantCreds);
        }
      }

      // Asynchronous logging: write to DB without delaying HTTP return (<300ms response)
      if (providerScope === 'meta') {
        leadPromise.then((resolvedLead) => {
          upsertBunnyMetaMessage({
            documentId: documentId,
            leadId: resolvedLead?._id ? String(resolvedLead._id) : undefined,
            phoneNumber: normalizedPhone,
            messageContent: finalMessageContent,
            headerText: headerText ? String(headerText) : undefined,
            footerText: footerText ? String(footerText) : undefined,
            senderDisplayName: senderDisplayName ? String(senderDisplayName) : undefined,
            metadata: { channel: providerScope },
            direction: 'outbound',
            status: 'sent',
            waMessageId: deliveryResult.waMessageId,
            whatsappMessageId: deliveryResult.waMessageId,
            sentAt: new Date().toISOString(),
            deliveredAt: new Date().toISOString(),
            provider: providerValue,
            sentByLabel: userId,
            sentByUserId: userId,
            ...(media?.url && {
              media: {
                url: media.url,
                kind: media.kind || 'image',
                fileName: media.fileName,
              },
              messageType: 'media',
            }),
          }).catch(err => console.error('[SEND] Background message save error:', err));

          updateBunnyMetaMessagesMany(
            { phoneNumber: normalizedPhone, leadId: resolvedLead?._id ? String(resolvedLead._id) : undefined, direction: 'inbound', statusNot: 'read' },
            { isRead: true, status: 'read', readAt: new Date().toISOString() }
          ).catch(err => console.error('[SEND] Auto-mark thread as read error:', err));

          if (resolvedLead) {
            saveBunnyLead({
              ...resolvedLead,
              lastMessageAt: new Date().toISOString(),
              lastMessageContent: finalMessageContent,
              lastDirection: 'outbound',
            }).catch(err => console.error('[SEND] Update lead activity error:', err));
          }
        }).catch(err => console.error('[SEND] Background lead logging error:', err));
      }

      return NextResponse.json(
        {
          success: true,
          messageId: documentId,
          status: 'sent',
          waMessageId: deliveryResult.waMessageId,
          provider: providerScope,
          data: {
            success: true,
            messageId: documentId,
            status: 'sent',
            waMessageId: deliveryResult.waMessageId,
            provider: providerScope,
          },
        },
        { status: 200 }
      );

    } catch (deliveryErr) {
      const errorMsg = deliveryErr instanceof Error ? deliveryErr.message : String(deliveryErr);
      const is24HrWindow = Boolean(
        errorMsg.includes('24-Hour') || 
        errorMsg.includes('24 hours') || 
        errorMsg.includes('131047') || 
        errorMsg.includes('Re-engagement') || 
        errorMsg.includes('re-engage')
      );

      // Async log failed status in background
      if (providerScope === 'meta') {
        leadPromise.then((resolvedLead) => {
          upsertBunnyMetaMessage({
            documentId: documentId,
            leadId: resolvedLead?._id ? String(resolvedLead._id) : undefined,
            phoneNumber: normalizedPhone,
            messageContent: finalMessageContent,
            direction: 'outbound',
            status: 'failed',
            errorMessage: errorMsg.substring(0, 500),
            sentAt: new Date().toISOString(),
            provider: providerValue,
            sentByLabel: userId,
            sentByUserId: userId,
          }).catch(err => console.error('[SEND] Failed to save failed message record:', err));
        }).catch(() => {});
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMsg.substring(0, 250),
          is24HrWindow,
          requiresTemplate: is24HrWindow,
          code: is24HrWindow ? '24_HOUR_WINDOW_EXPIRED' : 'DELIVERY_FAILED',
          messageId: documentId,
        },
        { status: 400 }
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
