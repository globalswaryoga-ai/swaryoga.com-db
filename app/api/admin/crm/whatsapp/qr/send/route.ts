export const dynamic = 'force-dynamic';
export const maxDuration = 60;
/**
 * QR WhatsApp Send Message API
 * POST /api/admin/crm/whatsapp/qr/send
 *
 * Sends a single WhatsApp message via the QR (Baileys) bridge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { getPublicMediaUrl } from '@/lib/whatsapp';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';
import { upsertBunnyQrMessage, upsertBunnyQrChat } from '@/lib/bunnyQrRepository';

// Use the same defaults/precedence as the QR bridge proxy. These are server-side routes,
// so prefer server-only env vars and only fall back to NEXT_PUBLIC_* if needed.
const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

async function resolveBridgeConfig(userId: string) {
  const isSuperAdminUser = userId === 'admin' || userId === 'admincrm';
  let settings = await getBunnyCrmUserSettings(userId).catch(() => null);

  if (!settings && isSuperAdminUser) {
    settings = await getBunnyCrmUserSettings('admincrm').catch(() => null);
  }

  const rawPhone = settings?.qrConnectedPhoneNumber || (isSuperAdminUser ? '919075358557' : '');
  const connectedPhone = String(rawPhone || '').split(':')[0].split('@')[0].replace(/\D/g, '');

  if (settings?.permanentTenantId) {
    return {
      bridgeUrl: BRIDGE_URL,
      bridgeSecret: BRIDGE_SECRET,
      bridgeSessionId: settings.permanentTenantId,
      tenantId: settings.permanentTenantId,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
      connectedPhone,
    };
  }

  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      bridgeSessionId: userId,
      tenantId: null,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
      connectedPhone,
    };
  }

  const fallbackSession = (process.env.QR_SUPER_ADMIN_SESSION_KEY || '0002456').trim();
  if (isSuperAdminUser && fallbackSession) {
    return {
      bridgeUrl: BRIDGE_URL,
      bridgeSecret: BRIDGE_SECRET,
      bridgeSessionId: fallbackSession,
      tenantId: fallbackSession,
      hasOwnBridge: true,
      qrWhatsappEnabled: true,
      connectedPhone: connectedPhone || '919075358557',
    };
  }

  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    bridgeSessionId: userId,
    tenantId: null,
    hasOwnBridge: false,
    qrWhatsappEnabled: !!settings?.qrWhatsappEnabled,
    connectedPhone,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let { to, message, type, url, buttons, caption, leadId, templateData } = body;
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = checkSuperAdmin(decoded);
    const bridgeConfig = await resolveBridgeConfig(viewerUserId);
    // Super admin shows as "Swar Yoga", others show their username
    const adminName = superAdmin ? 'Swar Yoga' : (decoded.name || decoded.username || viewerUserId);

    // ── Access Gate (isolated session required for every QR user) ──
    if (!bridgeConfig.hasOwnBridge) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. Every QR user needs an isolated WhatsApp session (permanentTenantId or custom bridge).'
      }, { status: 403 });
    }

    // Validate and normalize `to` field
    if (!to) {
      return NextResponse.json({ success: false, error: 'Missing recipient (to)' }, { status: 400 });
    }

    // Fix invalid @lid format to @c.us or @g.us
    if (typeof to === 'string' && to.includes('@lid')) {
      const baseId = to.replace('@lid', '');
      // Check if it's a group ID (long numeric)
      if (baseId.length > 15 && /^\d+$/.test(baseId)) {
        to = baseId + '@g.us';
      } else {
        to = baseId + '@c.us';
      }
    }

    // Ensure to is in proper WhatsApp format
    if (typeof to === 'string' && !to.includes('@')) {
      const phoneOnly = to.replace(/\D/g, '');
      if (phoneOnly.length > 15) {
        to = phoneOnly + '@g.us';
      } else {
        to = phoneOnly + '@c.us';
      }
    }

    // Extract phone number from `to` for access control check
    const phoneForCheck = typeof to === 'string' ? to.split('@')[0].replace(/\D/g, '') : '';

    // We append the admin name to the outgoing message so it's clear who sent it
    const attributionTag = `\n\n*${adminName}*`;
    let finalMessage = message;
    let finalCaption = caption || message;

    if (type === 'text' && message) {
      finalMessage = message + attributionTag;
    } else if (type === 'template' && message) {
      finalMessage = message;
      finalCaption = caption || message;
    } else if (type === 'image' && caption) {
      finalCaption = caption + attributionTag;
    } else if (message) {
      finalCaption = message + attributionTag;
    }

    // 1. Initial log in Bunny DB so it appears in inbox immediately
    const savedDbMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const rawChatJid = typeof to === 'string' && to.includes('@') ? to : `${String(to).replace(/\D/g, '')}@s.whatsapp.net`;
    const chatJid = rawChatJid.endsWith('@g.us') ? rawChatJid : (rawChatJid.length > 20 ? `${rawChatJid.split('@')[0]}@g.us` : `${rawChatJid.split('@')[0]}@s.whatsapp.net`);
    const contentToStore = message || caption || (url ? '📎 Media' : 'Message');
    const nowSeconds = Math.floor(Date.now() / 1000);

    try {
      if (bridgeConfig.connectedPhone && chatJid) {
        await upsertBunnyQrMessage({
          userId: viewerUserId,
          connectedPhone: bridgeConfig.connectedPhone,
          chatJid,
          messageId: savedDbMessageId,
          direction: 'outbound',
          fromMe: true,
          text: contentToStore,
          type: (type === 'image' || type === 'media') ? 'image' : (type || 'text'),
          participant: '',
          pushName: '',
          timestamp: nowSeconds,
          status: 0,
          hasMedia: !!url,
          mediaUrl: url || '',
          mediaMimetype: '',
          mediaFileName: '',
          metadata: { sessionKey: bridgeConfig.bridgeSessionId, tenantId: bridgeConfig.tenantId || bridgeConfig.bridgeSessionId },
        });
      }
    } catch (dbErr) {
      console.warn('[QR SEND BUNNY INIT LOG ERROR]:', dbErr);
    }

    // 2. Call Bridge to actually send the message
    let bridgeData: any = {};
    let bridgeOk = false;
    try {
      // Convert S3 URLs to signed URLs for media
      let signedUrl = url;
      if (url && (type === 'media' || type === 'image' || type === 'video')) {
        signedUrl = await getPublicMediaUrl(url);
        console.log('[QR SEND] Converted URL to signed:', signedUrl?.substring(0, 80));
      }
      
      // Use /send-template endpoint for templates (supports image + blue buttons)
      if (templateData && (templateData.headerMedia || templateData.buttons?.length > 0)) {
        console.log('[QR SEND] Using /send-template for bundled template with buttons');
        
        // Extract button texts
        const buttonTexts = templateData.buttons?.map((b: any) => 
          typeof b === 'string' ? b : (b.text || b.title || b.payload)
        ).filter(Boolean) || [];
        
        const bridgeRes = await fetch(`${bridgeConfig.bridgeUrl}/send-template`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-bridge-secret': bridgeConfig.bridgeSecret,
            'x-user-id': viewerUserId,
            'x-session-key': bridgeConfig.bridgeSessionId,
            ...(bridgeConfig.tenantId ? { 'x-tenant-id': bridgeConfig.tenantId } : {}),
          },
          body: JSON.stringify({ 
            to,
            imageUrl: signedUrl,
            bodyText: finalMessage || finalCaption,  // Body text with admin attribution
            buttons: buttonTexts,
            footerText: templateData.footerText || 'Swar Yoga'
          }),
          signal: AbortSignal.timeout(15000) // 15s timeout for template (sends 2 messages)
        });

        bridgeData = await bridgeRes.json();
        bridgeOk = bridgeRes.ok;
      } else {
        // Regular message (text/image without buttons)
        // Map 'media' type to 'image' for bridge compatibility
        const bridgeSendType = (type === 'media') ? 'image' : type;
        console.log(`[QR SEND] Calling bridge /send with type=${bridgeSendType}`);
        
        const bridgeRes = await fetch(`${bridgeConfig.bridgeUrl}/send`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-bridge-secret': bridgeConfig.bridgeSecret,
            'x-user-id': viewerUserId,
            'x-session-key': bridgeConfig.bridgeSessionId,
            ...(bridgeConfig.tenantId ? { 'x-tenant-id': bridgeConfig.tenantId } : {}),
          },
          body: JSON.stringify({ 
            to, 
            message: finalMessage, 
            type: bridgeSendType,
            url: signedUrl, 
            buttons, 
            caption: finalCaption 
          }),
          signal: AbortSignal.timeout(10000)
        });

        bridgeData = await bridgeRes.json();
        bridgeOk = bridgeRes.ok;
        
        // Check if WhatsApp is not connected (503 from bridge)
        if (bridgeRes.status === 503) {
          return NextResponse.json({ 
            success: false, 
            error: 'WhatsApp QR not connected. Please scan QR code first.',
            needsQr: true,
            dbMessageId: savedDbMessageId 
          }, { status: 200 }); // Return 200 so frontend handles gracefully
        }
      }
    } catch (fetchErr: any) {
      console.error('[QR SEND BRIDGE FETCH ERROR]:', fetchErr.message);
      return NextResponse.json({ 
        success: false, 
        error: 'WhatsApp QR not connected or bridge unavailable. Please scan QR code.',
        needsQr: true,
        dbMessageId: savedDbMessageId 
      }, { status: 200 }); // Return 200 so frontend handles gracefully
    }
    
    // Check if bridge returned success (bridgeData.success can be true even if HTTP isn't 200)
    const bridgeSuccess = bridgeOk || bridgeData.success === true;
    console.log(`[QR SEND] Bridge response: ok=${bridgeOk}, success=${bridgeData.success}, data=`, JSON.stringify(bridgeData).substring(0, 200));
    
    if (!bridgeSuccess) {
        // Check for "not connected" error from bridge
        const errorMsg = bridgeData.error || 'Bridge send failed';
        const isNotConnected = errorMsg.toLowerCase().includes('not connected') || 
                              errorMsg.toLowerCase().includes('not ready');
        
        // Update DB status to failed if bridge rejected it
        if (savedDbMessageId && bridgeConfig.connectedPhone && chatJid) {
          try {
            await upsertBunnyQrMessage({
              userId: viewerUserId,
              connectedPhone: bridgeConfig.connectedPhone,
              chatJid,
              messageId: savedDbMessageId,
              direction: 'outbound',
              fromMe: true,
              text: contentToStore,
              type: (type === 'image' || type === 'media') ? 'image' : (type || 'text'),
              participant: '',
              pushName: '',
              timestamp: nowSeconds,
              status: -1, // failed
              hasMedia: !!url,
              mediaUrl: url || '',
              mediaMimetype: '',
              mediaFileName: '',
              metadata: { error: errorMsg, sessionKey: bridgeConfig.bridgeSessionId, tenantId: bridgeConfig.tenantId || bridgeConfig.bridgeSessionId },
            });
          } catch (e) {}
        }
        
        return NextResponse.json({ 
          success: false, 
          error: isNotConnected ? 'WhatsApp QR not connected. Please scan QR code first.' : errorMsg,
          needsQr: isNotConnected,
          dbMessageId: savedDbMessageId
        }, { status: 200 }); // Return 200 so frontend handles gracefully
    }

    // Extract WhatsApp message ID from bridge response
    const whatsappMessageId = bridgeData.id || bridgeData.messageId || bridgeData.key?.id;
    
    // Log if there was a warning from the bridge
    if (bridgeData.warning) {
      console.log(`[QR SEND] ⚠️ Bridge warning: ${bridgeData.warning}`);
    }

    // 3. Upsert into Bunny DB (keyed by the REAL bridge message id)
    const finalSentId = whatsappMessageId || savedDbMessageId;
    if (bridgeConfig.connectedPhone && chatJid) {
      try {
        await upsertBunnyQrMessage({
          userId: viewerUserId,
          connectedPhone: bridgeConfig.connectedPhone,
          chatJid,
          messageId: finalSentId,
          direction: 'outbound',
          fromMe: true,
          text: finalMessage || finalCaption || contentToStore,
          type: (type === 'image' || type === 'media') ? 'image' : (type || 'text'),
          participant: '',
          pushName: '',
          timestamp: Math.floor(Date.now() / 1000),
          status: 1, // sent
          hasMedia: !!url,
          mediaUrl: url || '',
          mediaMimetype: '',
          mediaFileName: '',
          metadata: { sessionKey: bridgeConfig.bridgeSessionId, tenantId: bridgeConfig.tenantId || bridgeConfig.bridgeSessionId },
        });

        await upsertBunnyQrChat({
          userId: viewerUserId,
          connectedPhone: bridgeConfig.connectedPhone,
          chatJid,
          name: chatJid.split('@')[0],
          isGroup: chatJid.endsWith('@g.us'),
          lastMessage: finalMessage || finalCaption || contentToStore,
          lastMessageTime: new Date().toISOString(),
          lastMessageFromMe: true,
          conversationTimestamp: Math.floor(Date.now() / 1000),
        }).catch(() => {});
      } catch (qrErr) {
        console.warn('[QR SEND] Failed to upsert bunny qr message:', qrErr);
      }
    }

    // Return both IDs for frontend
    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId || savedDbMessageId,
      dbMessageId: savedDbMessageId,
      whatsappMessageId: whatsappMessageId
    });
  } catch (err: any) {
    console.error('[QR SEND API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
