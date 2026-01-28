import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getPublicMediaUrl } from '@/lib/whatsapp';

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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let { to, message, type, url, buttons, caption, leadId } = body;
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = decoded.userId === 'admincrm' || decoded.userId === 'admin';
    // Super admin shows as "Swar Yoga", others show their username
    const adminName = superAdmin ? 'Swar Yoga' : (decoded.name || decoded.username || viewerUserId);

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
      let lead = null;
      if (leadId) {
        lead = await Lead.findById(leadId);
      } else if (phoneForCheck && phoneForCheck.length >= 10) {
        lead = await Lead.findOne({ phoneNumber: phoneForCheck });
      }
      
      if (lead) {
        const assignedTo = String(lead.assignedToUserId || '').trim();
        // If lead is assigned to someone else, block the message
        if (assignedTo && assignedTo !== viewerUserId) {
          console.log(`[QR SEND] Access denied: ${viewerUserId} tried to message lead assigned to ${assignedTo}`);
          return NextResponse.json({
            success: false,
            error: `This lead is assigned to another user. You can only message leads assigned to you.`
          }, { status: 403 });
        }
        // If lead is unassigned, allow (first-come-first-served or auto-assign could happen)
      }
      // If no lead found, allow (new contact)
    }

    // We append the admin name to the outgoing message so it's clear who sent it
    // Format: message on top, admin name in bold below
    const attributionTag = `\n\n*${adminName}*`;
    let finalMessage = message;
    let finalCaption = caption || message;

    if (type === 'text' && message) {
      finalMessage = message + attributionTag;
    } else if (caption) {
      finalCaption = caption + attributionTag;
    } else if (message) {
      finalCaption = message + attributionTag;
    }

    // 1. Log in DB immediately so it appears in the inbox history (CRM fallback)
    // even if the bridge takes time or is briefly unavailable.
    let savedDbMessageId: string | null = null;
    try {
      await connectDB();
      const WhatsAppMessage = getWhatsAppMessage();
      const Lead = getLead();
      
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

      const savedMessage = await WhatsAppMessage.create({
        phoneNumber: phone || 'unknown',
        leadId: lead?._id || leadId,
        direction: 'outbound',
        messageContent: contentToStore,
        messageType: type === 'buttons' ? 'interactive' : (type === 'text' ? 'text' : 'media'),
        media: url ? { kind: type, url: url } : undefined,
        status: 'pending', // Mark as pending initially
        sentByLabel: adminName,
        sentByUserId: viewerUserId,
        senderDisplayName: adminName,
        provider: 'whatsapp_web_bridge',
        sentAt: new Date()
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
      
      const bridgeRes = await fetch(`${BRIDGE_URL}/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-bridge-secret': BRIDGE_SECRET
        },
        body: JSON.stringify({ to, message: finalMessage, type, url: signedUrl, buttons, caption: finalCaption }),
        signal: AbortSignal.timeout(10000) // 10s timeout for bridge call
      });

      bridgeData = await bridgeRes.json();
      bridgeOk = bridgeRes.ok;
    } catch (fetchErr: any) {
      console.error('[QR SEND BRIDGE FETCH ERROR]:', fetchErr.message);
      return NextResponse.json({ 
        success: false, 
        error: `Bridge connection error: ${fetchErr.message}`,
        dbMessageId: savedDbMessageId 
      }, { status: 503 });
    }
    
    // Check if bridge returned success (bridgeData.success can be true even if HTTP isn't 200)
    const bridgeSuccess = bridgeOk || bridgeData.success === true;
    
    if (!bridgeSuccess) {
        // Update DB status to failed if bridge rejected it
        if (savedDbMessageId) {
          try {
            const WhatsAppMessage = getWhatsAppMessage();
            await WhatsAppMessage.findByIdAndUpdate(savedDbMessageId, { 
              status: 'failed', 
              failureReason: bridgeData.error || 'Bridge rejected request' 
            });
          } catch (e) {}
        }
        return NextResponse.json({ 
          success: false, 
          error: bridgeData.error || 'Bridge send failed',
          dbMessageId: savedDbMessageId
        }, { status: 400 });
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
