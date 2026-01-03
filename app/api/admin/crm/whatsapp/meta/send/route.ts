import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';

async function safeReadJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/crm/whatsapp/meta/send
 * Send message via Meta WhatsApp Cloud API
 * 
 * Body: { leadId, phoneNumber, messageContent }
 * Response: { success, data: { messageId, status }, error? }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin auth
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // 2. Check credentials
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        {
          error: 'Meta WhatsApp not configured',
          details: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID missing',
        },
        { status: 503 }
      );
    }

    // 3. Parse request
    const body = await request.json();
    const { leadId, phoneNumber, messageContent } = body;

    if (!phoneNumber || !messageContent) {
      return NextResponse.json(
        { error: 'phoneNumber and messageContent required' },
        { status: 400 }
      );
    }

    // Normalize phone: remove non-digits, ensure no + prefix for API
    let normalizedPhone = String(phoneNumber).replace(/\D/g, '');
    if (normalizedPhone.startsWith('91')) {
      // Indian number - good
    } else if (normalizedPhone.length === 10) {
      // Add country code for 10-digit India numbers
      normalizedPhone = '91' + normalizedPhone;
    }

    console.log(`[META] Sending to ${normalizedPhone}: "${messageContent}"`);

    // 4. Connect to DB
    await connectDB();

    // 5. Create message record
    const now = new Date();
    const messageRecord = await WhatsAppMessage.create({
      leadId: leadId || null,
      phoneNumber: normalizedPhone,
      messageContent: String(messageContent),
      direction: 'outbound',
      status: 'queued',
      sentAt: now,
      method: 'meta', // Track that it came via Meta API
    });

    // 6. Send via Meta API
  // WhatsApp Cloud API is served from graph.facebook.com (Meta Graph API).
  // Using graph.instagram.com can cause 400/500 depending on infra.
  const metaUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const metaPayload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageContent,
      },
    };

    console.log(`[META] POST ${metaUrl}`, { ...metaPayload, text: { ...metaPayload.text } });

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const metaData = await safeReadJson(metaRes);

  console.log(`[META] Response: ${metaRes.status}`, metaData || '(non-json response)');

    if (!metaRes.ok) {
      console.error(`[META] ❌ API Error:`, metaData || '(non-json response)');

      // Update message status to failed
      const errMessage =
        metaData?.error?.message ||
        metaData?.message ||
        (metaRes.status ? `HTTP ${metaRes.status}` : 'Unknown error');

      await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
        status: 'failed',
        errorMessage: errMessage,
      });

      return NextResponse.json(
        {
          error: 'Failed to send via Meta API',
          details: errMessage,
        },
        { status: metaRes.status || 500 }
      );
    }

    // 7. Success - update message status
    const metaMessageId = metaData.messages?.[0]?.id;

    await WhatsAppMessage.findByIdAndUpdate(messageRecord._id, {
      status: 'sent',
      sentAt: now,
      externalMessageId: metaMessageId, // Store Meta's message ID for webhook tracking
    });

    console.log(`[META] ✅ Message sent! ID: ${metaMessageId}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          messageId: messageRecord._id,
          externalId: metaMessageId,
          status: 'sent',
          to: normalizedPhone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[META] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
