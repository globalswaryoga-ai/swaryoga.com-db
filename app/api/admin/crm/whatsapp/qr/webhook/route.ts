import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { uploadToS3 } from '@/lib/aws-s3';

/**
 * QR Bridge Webhook - receives incoming messages from the WhatsApp Web bridge
 * This is separate from Meta Cloud API webhook
 */

const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://52.91.198.23:3333';

// Map WhatsApp message types to our schema types
function mapMessageType(waType: string): 'text' | 'template' | 'media' {
  switch (waType) {
    case 'chat':
    case 'text':
      return 'text';
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker':
    case 'ptt': // voice note
      return 'media';
    default:
      return 'text';
  }
}

// Helper to fetch media from bridge and upload to S3
async function fetchAndUploadMedia(
  messageId: string, 
  phoneNumber: string, 
  type: string
): Promise<{ url: string; mimeType: string } | null> {
  try {
    console.log('[QR WEBHOOK MEDIA] Fetching media from bridge for:', messageId);
    
    const mediaRes = await fetch(`${BRIDGE_URL}/messages/media/${encodeURIComponent(messageId)}`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET },
      signal: AbortSignal.timeout(30000), // 30 second timeout for media download
    });
    
    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      console.error('[QR WEBHOOK MEDIA] Bridge returned error:', mediaRes.status, errText);
      return null;
    }
    
    const mediaData = await mediaRes.json();
    
    if (!mediaData.success || !mediaData.data) {
      console.error('[QR WEBHOOK MEDIA] Invalid media response:', mediaData);
      return null;
    }
    
    console.log('[QR WEBHOOK MEDIA] Got media, type:', mediaData.mimetype, 'size:', mediaData.data?.length || 0);
    
    // Convert base64 to buffer
    const buffer = Buffer.from(mediaData.data, 'base64');
    
    if (buffer.length === 0) {
      console.error('[QR WEBHOOK MEDIA] Empty media buffer');
      return null;
    }
    
    // Determine file extension from mimetype
    const mimeType = mediaData.mimetype || 'application/octet-stream';
    const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
    const fileName = `whatsapp-qr-inbound/${phoneNumber}/${Date.now()}.${extension}`;
    
    // Upload to S3
    const s3Url = await uploadToS3(buffer, fileName, {
      metadata: {
        'wa-message-id': messageId,
        'phone-number': phoneNumber,
        'media-type': type,
        'direction': 'inbound',
        'provider': 'qr-bridge'
      }
    });
    
    console.log('[QR WEBHOOK MEDIA] ✅ Uploaded to S3:', s3Url);
    return { url: s3Url, mimeType };
  } catch (err: any) {
    console.error('[QR WEBHOOK MEDIA ERROR]:', err.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify bridge secret
    const secret = req.headers.get('x-bridge-secret') || '';
    if (secret !== BRIDGE_SECRET) {
      console.log('[QR WEBHOOK] Unauthorized - invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[QR WEBHOOK] Received:', JSON.stringify(body).substring(0, 200));

    const { from, to, body: messageBody, timestamp, type, hasMedia, messageId, contactName } = body;

    if (!from || !messageBody) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_from_or_body' });
    }

    // Skip status broadcasts
    if (from === 'status@broadcast') {
      return NextResponse.json({ success: true, skipped: true, reason: 'status_broadcast' });
    }

    // NOTE: Bridge now resolves @lid to actual phone numbers before sending
    // So 'from' field should already be in format like 919309986820@c.us
    // If it still contains @lid, the bridge couldn't resolve it - log and skip
    if (from.includes('@lid')) {
      console.log('[QR WEBHOOK] Unresolved @lid format, bridge should resolve this:', from);
      return NextResponse.json({ success: true, skipped: true, reason: 'unresolved_lid' });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();

    // Extract phone number from WhatsApp ID (e.g., "919309986820@c.us" -> "919309986820")
    const phoneNumber = from.split('@')[0].replace(/\D/g, '');
    
    // Validate: must be 10-15 digits (real phone numbers)
    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
      console.log('[QR WEBHOOK] Invalid phone length:', phoneNumber, 'from:', from);
      return NextResponse.json({ success: true, skipped: true, reason: 'invalid_phone' });
    }

    // Check for duplicate message
    const existing = await WhatsAppMessage.findOne({ waMessageId: messageId });
    if (existing) {
      console.log('[QR WEBHOOK] Duplicate message, skipping:', messageId);
      return NextResponse.json({ success: true, skipped: true, reason: 'duplicate' });
    }

    // Find or create lead
    let lead = await Lead.findOne({ phoneNumber });
    if (!lead) {
      // Create new lead from incoming message
      const leadNumber = await allocateNextLeadNumber();
      lead = await Lead.create({
        phoneNumber,
        name: `WhatsApp ${phoneNumber.slice(-4)}`,
        source: 'whatsapp',
        status: 'lead',
        leadNumber,
      });
      console.log('[QR WEBHOOK] Created new lead:', lead._id, 'Phone:', phoneNumber);
    }

    // Handle media if present
    let mediaUrl: string | undefined;
    let mimeType: string | undefined;
    
    if (hasMedia && messageId) {
      const mediaResult = await fetchAndUploadMedia(messageId, phoneNumber, type || 'media');
      if (mediaResult) {
        mediaUrl = mediaResult.url;
        mimeType = mediaResult.mimeType;
      }
    }

    // Determine the message type
    const mappedType = mapMessageType(type || 'text');
    
    // Save the incoming message
    const savedMessage = await WhatsAppMessage.create({
      phoneNumber,
      leadId: lead._id,
      direction: 'inbound',
      messageContent: messageBody,
      messageType: mappedType,
      hasMedia: hasMedia || false,
      // Store media info if available
      ...(mediaUrl && {
        media: {
          url: mediaUrl,
          mimeType: mimeType,
          type: type || 'media',
        }
      }),
      waMessageId: messageId,
      status: 'received',
      provider: 'whatsapp_web_bridge',
      sentAt: timestamp ? new Date(timestamp * 1000) : new Date(),
    });

    // Update lead name if we have contactName from bridge
    if (contactName && lead.name?.startsWith('WhatsApp ')) {
      await Lead.updateOne({ _id: lead._id }, { name: contactName });
    }

    console.log('[QR WEBHOOK] Saved inbound message:', savedMessage._id, 'From:', phoneNumber);

    return NextResponse.json({ 
      success: true, 
      messageId: savedMessage._id,
      leadId: lead._id 
    });
  } catch (err: any) {
    console.error('[QR WEBHOOK ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
