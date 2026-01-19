import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';

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
    const { to, message, type, url, buttons, caption, leadId } = body;
    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = decoded.userId === 'admincrm' || decoded.userId === 'admin';
    const adminName = decoded.name || decoded.username || viewerUserId;

    // ACCESS CONTROL: If leadId provided, check if admin is assigned
    if (leadId && !superAdmin) {
      await connectDB();
      const Lead = getLead();
      const lead = await Lead.findById(leadId);
      
      if (lead) {
        const assignedTo = String(lead.assignedToUserId || '').trim();
        if (assignedTo && assignedTo !== viewerUserId) {
          return NextResponse.json({
            success: false,
            error: `Forbidden: You can only message leads assigned to you`
          }, { status: 403 });
        }
      }
    }

    // We append the admin name to the outgoing message so it's clear who sent it
    const attributionTag = `\n\n- ${adminName}`;
    let finalMessage = message;
    let finalCaption = caption || message;

    if (type === 'text' && message) {
      finalMessage = message + attributionTag;
    } else if (caption) {
      finalCaption = caption + attributionTag;
    } else if (message) {
      finalCaption = message + attributionTag;
    }

    // 1. Call Bridge to actually send the message
    const bridgeRes = await fetch(`${BRIDGE_URL}/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET
      },
      body: JSON.stringify({ to, message: finalMessage, type, url, buttons, caption: finalCaption })
    });

    const bridgeData = await bridgeRes.json();
    
    if (!bridgeRes.ok) {
        return NextResponse.json({ success: false, error: bridgeData.error || 'Bridge send failed' }, { status: bridgeRes.status });
    }

    // 2. Log in DB for attribution ("so we can find out who has sent it")
    try {
      await connectDB();
      const WhatsAppMessage = getWhatsAppMessage();
      const Lead = getLead();
      
      const phone = typeof to === 'string' ? to.split('@')[0] : (to.user || to._serialized?.split('@')[0]);
      const lead = await Lead.findOne({ phoneNumber: phone });

      const savedMessage = await WhatsAppMessage.create({
        phoneNumber: phone || 'unknown',
        leadId: lead?._id,
        direction: 'outbound',
        messageContent: message || `Sent ${type || 'media'}`,
        messageType: type === 'buttons' ? 'interactive' : (type === 'text' ? 'text' : 'media'),
        media: url ? { kind: type, url: url } : undefined,
        status: 'sent',
        sentByLabel: adminName,
        sentByUserId: viewerUserId,
        senderDisplayName: adminName,
        provider: 'whatsapp_web_bridge',
        sentAt: new Date()
      });

      console.log(`[QR SEND] ✅ Message logged to DB: ${savedMessage._id}`);
      
      return NextResponse.json({ success: true, messageId: savedMessage._id });
    } catch (dbErr) {
      console.error('[QR SEND DB LOG ERROR]:', dbErr);
      // Return success because message was sent via bridge, even if logging failed
      return NextResponse.json({ success: true, message: 'Message sent but logging to DB failed' });
    }
  } catch (err: any) {
    console.error('[QR SEND API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
