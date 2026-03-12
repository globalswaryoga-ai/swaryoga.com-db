/**
 * QR WhatsApp Send Message API
 * POST /api/admin/crm/whatsapp/qr/send
 *
 * Sends a single WhatsApp message via the QR (Baileys) bridge.
 *
 * Access Control (role hierarchy):
 * ─────────────────────────────────────────────────────────────────
 * Super Admin      → Always allowed. Sends via shared bridge.
 * Super Admin Team → Allowed only if qrWhatsappEnabled=true in crm_user_settings.
 * CRM Admin        → Allowed (has own qrBridgeUrl in crm_user_settings).
 * CRM Admin Team   → Allowed only if qrWhatsappEnabled=true under tenant.
 * Leads            → No CRM access.
 * ─────────────────────────────────────────────────────────────────
 *
 * Saves outbound messages to WhatsAppMessage collection and updates Lead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage, getLead, getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { getPublicMediaUrl } from '@/lib/whatsapp';
import mongoose from 'mongoose';

// Use the same defaults/precedence as the QR bridge proxy. These are server-side routes,
// so prefer server-only env vars and only fall back to NEXT_PUBLIC_* if needed.
const DEFAULT_BRIDGE_URL = 'http://52.91.198.23:3333';
const BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  DEFAULT_BRIDGE_URL;

const BRIDGE_SECRET =
  process.env.WHATSAPP_BRIDGE_SECRET ||
  process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
  'swar-bridge-secret-2024';

async function resolveBridgeConfig(userId: string) {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings = await CRMUserSettings.findOne(
    { userId },
    { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 }
  ).lean() as any;

  if (settings?.permanentTenantId) {
    return {
      bridgeUrl: `${BRIDGE_URL}/tenant/${settings.permanentTenantId}`,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    hasOwnBridge: false,
    qrWhatsappEnabled: !!settings?.qrWhatsappEnabled,
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

    // ── Access Gate (Super Admin Team / CRM Admin Team Protection) ──
    // Non-Super-Admin users must have qrWhatsappEnabled=true or their own bridge.
    // Without this, they would be sending from the Super Admin's WhatsApp illegitimately.
    if (!superAdmin) {
      if (!bridgeConfig.hasOwnBridge && !bridgeConfig.qrWhatsappEnabled) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You need your own WhatsApp bridge configured to send QR messages.'
        }, { status: 403 });
      }

      // Tenant owners with qrWhatsappEnabled must NOT use the shared bridge.
      // They must configure their own bridge URL.
      if (!bridgeConfig.hasOwnBridge && bridgeConfig.qrWhatsappEnabled) {
        try {
          const db = mongoose.connection.db;
          if (db) {
            const tenantDoc = await db.collection('tenants').findOne({
              $or: [
                { ownerUserId: viewerUserId },
                { adminUserId: viewerUserId },
                { ownerEmail: decoded.email || viewerUserId },
              ],
            }, { projection: { _id: 1 } });
            if (tenantDoc) {
              return NextResponse.json({
                success: false,
                error: 'Access denied. CRM tenants must configure their own WhatsApp bridge.'
              }, { status: 403 });
            }
          }
        } catch {
          // Fail-safe: block on error
          return NextResponse.json({ success: false, error: 'Bridge access check failed' }, { status: 500 });
        }
      }
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

    // ACCESS CONTROL: Non-super admins can only message leads assigned to them
    if (!superAdmin) {
      await connectDB();
      const Lead = getLead();
      
      // Find lead by leadId or phone number
      let lead: any = null;
      if (leadId) {
        lead = await Lead.findById(leadId);
      } else if (phoneForCheck && phoneForCheck.length >= 10) {
        lead = await Lead.findOne({ phoneNumber: phoneForCheck });
      }
      
      if (lead) {
        const assignedTo = String(lead.assignedToUserId || '').trim();
        const createdBy = String(lead.createdByUserId || '').trim();
        // If lead is assigned to someone else (and not created by viewer), block the message
        if (assignedTo && assignedTo !== viewerUserId && createdBy !== viewerUserId) {
          console.log(`[QR SEND] Access denied: ${viewerUserId} tried to message lead assigned to ${assignedTo}`);
          return NextResponse.json({
            success: false,
            error: `This lead is assigned to another user. You can only message leads assigned to you or created by you.`
          }, { status: 403 });
        }
        // If lead is unassigned but created by viewer, allow
      }
      // If no lead found, allow (new contact)
    }

    // We append the admin name to the outgoing message so it's clear who sent it
    // Format: message on top, admin name in bold below
    // NOTE: Templates should NOT have admin attribution - they are official branded messages
    const attributionTag = `\n\n*${adminName}*`;
    let finalMessage = message;
    let finalCaption = caption || message;

    if (type === 'text' && message) {
      // Only add attribution to regular text messages, not templates
      finalMessage = message + attributionTag;
    } else if (type === 'template' && message) {
      // Templates: NO attribution - they are official branded messages
      finalMessage = message;
      finalCaption = caption || message;
    } else if (type === 'image' && caption) {
      // Images with captions get attribution
      finalCaption = caption + attributionTag;
    } else if (message) {
      finalCaption = message + attributionTag;
    }

    // 1. Log in DB immediately so it appears in the inbox history (CRM fallback)
    // even if the bridge takes time or is briefly unavailable.
    let savedDbMessageId: string | null = null;
    try {
      console.log('[QR SEND] Connecting to DB...');
      await connectDB();
      console.log('[QR SEND] DB Connected, getting models...');
      const WhatsAppMessage = getWhatsAppMessage();
      const Lead = getLead();
      console.log('[QR SEND] Models retrieved');
      
      // Extract phone number from `to` field
      // Handle formats: "919309986820@c.us", "919309986820", or object { user: "919309986820" }
      let rawPhone = typeof to === 'string' ? to.split('@')[0] : (to.user || to._serialized?.split('@')[0]);
      
      // Normalize: remove all non-digits
      let phone = String(rawPhone || '').replace(/\D/g, '');
      
      // Validate phone number format (should be 10-15 digits, not a timestamp)
      // Timestamps are typically > 13 digits and start with 17... (2020+)
      if (!phone || phone.length < 10 || phone.length > 15) {
        console.warn(`[QR SEND] Invalid phone number detected: ${phone} (raw: ${rawPhone})`);
        // Try to get phone from leadId if provided
        if (leadId) {
          const existingLead = await Lead.findById(leadId);
          if (existingLead?.phoneNumber) {
            phone = existingLead.phoneNumber;
            console.log(`[QR SEND] Recovered phone from leadId: ${phone}`);
          }
        }
      }
      
      const lead = await Lead.findOne({ phoneNumber: phone });

      // For media without caption, use a descriptive placeholder
      const mediaLabel = type === 'image' ? '📷 Image' : type === 'video' ? '🎬 Video' : type === 'audio' ? '🎵 Audio' : type === 'document' ? '📄 Document' : '📎 Media';
      const contentToStore = message || caption || (url ? mediaLabel : 'Message');
      
      // Determine messageType for DB storage
      const dbMessageType = templateData ? 'template' : (type === 'buttons' ? 'interactive' : (type === 'text' ? 'text' : 'media'));
      // Map 'media' to 'image' for bridge compatibility
      const bridgeMediaType = (type === 'media' || type === 'image') ? 'image' : type;

      // For templates, get image URL from headerMedia if available
      const templateImageUrl = templateData?.headerMedia?.url || templateData?.headerContent;
      const effectiveMediaUrl = url || (templateData?.headerFormat === 'IMAGE' ? templateImageUrl : null);

      console.log(`[QR SEND] Saving message: type=${type}, bridgeType=${bridgeMediaType}, messageType=${dbMessageType}, mediaUrl=${effectiveMediaUrl ? 'yes' : 'no'}`);

      const savedMessage = await WhatsAppMessage.create({
        phoneNumber: phone || 'unknown',
        leadId: lead?._id || leadId,
        direction: 'outbound',
        messageContent: contentToStore,
        messageType: dbMessageType,
        media: effectiveMediaUrl ? { kind: 'image', url: effectiveMediaUrl } : undefined,
        status: 'pending', // Mark as pending initially
        sentByLabel: adminName,
        sentByUserId: viewerUserId,
        senderDisplayName: adminName,
        provider: 'whatsapp_web_bridge',
        sentAt: new Date(),
        // Store template metadata for inbox preview
        metadata: templateData ? {
          template: {
            templateName: templateData.templateName,
            headerFormat: templateData.headerFormat,
            headerContent: templateData.headerContent,
            headerMedia: templateData.headerMedia,
            footerText: templateData.footerText,
            buttons: templateData.buttons,
          }
        } : undefined
      });
      savedDbMessageId = savedMessage._id.toString();
      console.log(`[QR SEND] 💾 Initial log saved to DB: ${savedDbMessageId}`);
    } catch (dbErr) {
      console.error('[QR SEND DB INIT LOG ERROR]:', dbErr);
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
        if (savedDbMessageId) {
          try {
            const WhatsAppMessage = getWhatsAppMessage();
            await WhatsAppMessage.findByIdAndUpdate(savedDbMessageId, { 
              status: 'failed', 
              failureReason: errorMsg 
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

    // 3. Update DB with success status and WhatsApp ID
    if (savedDbMessageId) {
      try {
        const WhatsAppMessage = getWhatsAppMessage();
        await WhatsAppMessage.findByIdAndUpdate(savedDbMessageId, {
          status: 'sent',
          waMessageId: whatsappMessageId
        });
        console.log(`[QR SEND] ✅ Message status updated to sent: ${savedDbMessageId}`);
      } catch (dbErr) {
        console.error('[QR SEND DB UPDATE ERROR]:', dbErr);
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
