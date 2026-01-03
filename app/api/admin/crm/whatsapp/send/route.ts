import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

// WhatsApp Bridge URL - used to send messages via whatsapp-web.js (personal number)
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com';

// Meta API credentials
const META_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Send message via Meta WhatsApp Cloud API (official business number)
 * Uses the Meta Phone Number ID configured in Vercel environment
 */
async function sendViaMeta(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    return { success: false, error: 'Meta API not configured' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || data?.message || `Meta API error (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id || 'meta-sent',
    };
  } catch (err) {
    return {
      success: false,
      error: `Meta connection error: ${String(err)}`,
    };
  }
}

/**
 * Send message via WhatsApp Web Bridge (personal number via whatsapp-web.js)
 * Fallback when Meta API is unavailable
 */
async function sendViaBridge(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${BRIDGE_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneNumber, message }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.messageId || 'bridge-sent',
      };
    } else {
      return {
        success: false,
        error: 'Bridge unavailable',
      };
    }
  } catch (err) {
    return {
      success: false,
      error: `Bridge offline: ${String(err)}`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { leadId, phoneNumber, messageContent } = body;
    if (!phoneNumber || !messageContent) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectDB();

    // Find or create lead
    let lead = leadId ? await Lead.findById(leadId) : null;
    if (!lead) {
      lead = await Lead.findOne({ phoneNumber: normalizePhone(String(phoneNumber)) });
    }
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: normalizePhone(String(phoneNumber)),
        source: 'crm',
        status: 'lead',
        labels: [],
      });
    }

    const to = normalizePhone(String(phoneNumber));

    // Create message record in database (always)
    const messageRecord = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: to,
      messageContent: String(messageContent),
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date(),
      provider: 'pending', // Will be updated based on which provider succeeds
    });

    let sentVia = '';
    let finalStatus = 'queued';
    let warning = '';

    // **PRIMARY: Try Meta API first** (official business number)
    console.log(`[WhatsApp] Attempting Meta API send to ${to}`);
    const metaResult = await sendViaMeta(to, String(messageContent));
    
    if (metaResult.success) {
      sentVia = 'meta';
      finalStatus = 'sent';
      console.log(`[WhatsApp] ✅ Sent via Meta API (messageId: ${metaResult.messageId})`);
      
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: finalStatus,
        provider: 'meta',
        waMessageId: metaResult.messageId,
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecord._id,
          status: finalStatus,
          via: 'meta',
          waMessageId: metaResult.messageId,
        },
      }, { status: 200 });
    }

    console.log(`[WhatsApp] ⚠️  Meta API failed: ${metaResult.error}`);

    // **FALLBACK: Try Web Bridge** (personal number)
    console.log(`[WhatsApp] Attempting Web Bridge send to ${to}`);
    const bridgeResult = await sendViaBridge(to, String(messageContent));

    if (bridgeResult.success) {
      sentVia = 'bridge';
      finalStatus = 'sent';
      warning = '';
      console.log(`[WhatsApp] ✅ Sent via Web Bridge (messageId: ${bridgeResult.messageId})`);
      
      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: finalStatus,
        provider: 'bridge',
        waMessageId: bridgeResult.messageId,
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: messageRecord._id,
          status: finalStatus,
          via: 'bridge',
          waMessageId: bridgeResult.messageId,
        },
      }, { status: 200 });
    }

    console.log(`[WhatsApp] ⚠️  Web Bridge failed: ${bridgeResult.error}`);

    // **QUEUED: Both failed, message queued in database**
    console.log(`[WhatsApp] 📦 Both providers failed, message queued in DB`);
    warning = `${metaResult.error} + ${bridgeResult.error}`;

    await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
      status: 'queued',
      provider: 'none',
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId: messageRecord._id,
        status: 'queued',
        via: 'database',
        warning: warning.substring(0, 100), // Truncate long error strings
      },
    }, { status: 202 });

  } catch (error: any) {
    console.error('[WhatsApp] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
