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
    const { to, message, type, url, buttons, caption } = body;
    const viewerUserId = getViewerUserId(decoded);
    const adminName = decoded.name || decoded.username || viewerUserId;

    // We append the admin name to the outgoing message so it's clear who sent it 
    // as requested: "add admin user name in out going chat"
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

      await WhatsAppMessage.create({
        phoneNumber: phone || 'unknown',
        leadId: lead?._id,
        direction: 'outbound',
        messageContent: message || `Sent ${type || 'media'}`,
        messageType: type === 'buttons' ? 'interactive' : (type === 'text' ? 'text' : 'media'),
        media: url ? { kind: type, url: url } : undefined,
        waMessageId: bridgeData.messageId,
        status: 'sent',
        sentByLabel: adminName,
        senderDisplayName: adminName,
        provider: 'whatsapp_web_bridge',
        sentAt: new Date()
      });
    } catch (dbErr) {
      console.error('[QR SEND DB LOG ERROR]:', dbErr);
      // We don't fail the request if just logging failed, but the message sent.
    }

    return NextResponse.json({ success: true, messageId: bridgeData.messageId });
  } catch (err: any) {
    console.error('[QR SEND API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
