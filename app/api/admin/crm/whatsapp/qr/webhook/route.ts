import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage, getLead, getBroadcastRunMessage } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { uploadToS3 } from '@/lib/aws-s3';

/**
 * QR Bridge Webhook - receives incoming messages from the WhatsApp Web bridge
 * This is separate from Meta Cloud API webhook
 */

const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://52.91.198.23:3333';

/**
 * Handle status updates (delivered/read receipts) from the bridge
 */
async function handleStatusUpdate(body: any): Promise<NextResponse> {
  const { messageId, status, timestamp } = body;
  
  if (!messageId || !status) {
    return NextResponse.json({ success: true, skipped: true, reason: 'missing_fields' });
  }
  
  console.log(`[QR WEBHOOK] Status update: ${messageId} -> ${status}`);
  
  await connectDB();
  const WhatsAppMessage = getWhatsAppMessage();
  const BroadcastMessage = getBroadcastRunMessage();
  
  // Update fields based on status
  const updateData: any = { status };
  if (status === 'delivered') {
    updateData.deliveredAt = timestamp ? new Date(timestamp) : new Date();
  } else if (status === 'read') {
    updateData.readAt = timestamp ? new Date(timestamp) : new Date();
  }
  
  // Try updating in WhatsAppMessage collection (individual messages)
  const waResult = await WhatsAppMessage.updateOne(
    { waMessageId: messageId },
    { $set: updateData }
  );
  
  // Also try updating in BroadcastMessage collection (broadcast messages)
  const bcResult = await BroadcastMessage.updateOne(
    { waMessageId: messageId },
    { $set: updateData }
  );
  
  const updated = (waResult.modifiedCount || 0) + (bcResult.modifiedCount || 0);
  
  if (updated > 0) {
    console.log(`[QR WEBHOOK] ✅ Status updated: ${messageId} -> ${status}`);
    return NextResponse.json({ success: true, updated });
  } else {
    console.log(`[QR WEBHOOK] Message not found for status update: ${messageId}`);
    return NextResponse.json({ success: true, skipped: true, reason: 'message_not_found' });
  }
}

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
    console.log('[QR WEBHOOK] Received:', JSON.stringify(body).substring(0, 300));

    // Handle status updates (delivered/read receipts)
    if (body.type === 'status_update') {
      return handleStatusUpdate(body);
    }

    // Support both old format (from/body) and new Baileys format (from/messageContent)
    const from = body.from;
    const messageBody = body.body || body.messageContent;
    const timestamp = body.timestamp;
    const type = body.type || body.messageType || 'text';
    const hasMedia = body.hasMedia || ['image', 'video', 'audio', 'document', 'sticker'].includes(type);
    const messageId = body.messageId;
    const contactName = body.contactName || body.pushName;
    const mediaUrl = body.mediaUrl;
    // New: media sent directly as base64 from bridge
    const mediaBase64 = body.mediaBase64;
    const mediaMimeType = body.mediaMimeType;

    // Skip if no sender - but allow empty body for media messages
    if (!from) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_from' });
    }
    
    // Skip if no body AND no media (nothing to save)
    if (!messageBody && !hasMedia) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_body_or_media' });
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
    // Also handle raw phone number format from Baileys
    let phoneNumber = from.split('@')[0].replace(/\D/g, '');
    
    // If already just digits, use as-is
    if (!phoneNumber && /^\d+$/.test(from)) {
      phoneNumber = from;
    }
    
    // Validate: must be 10-15 digits (real phone numbers)
    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 15) {
      console.log('[QR WEBHOOK] Invalid phone length:', phoneNumber, 'from:', from);
      return NextResponse.json({ success: true, skipped: true, reason: 'invalid_phone' });
    }

    // Check for duplicate message
    if (messageId) {
      const existing = await WhatsAppMessage.findOne({ waMessageId: messageId });
      if (existing) {
        console.log('[QR WEBHOOK] Duplicate message, skipping:', messageId);
        return NextResponse.json({ success: true, skipped: true, reason: 'duplicate' });
      }
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
    let savedMediaUrl: string | undefined = mediaUrl; // Use mediaUrl from Baileys if already provided
    let mimeType: string | undefined = mediaMimeType;
    
    // If media sent as base64 directly from bridge, upload to S3
    if (mediaBase64 && !savedMediaUrl) {
      try {
        console.log('[QR WEBHOOK MEDIA] Processing base64 media, type:', mediaMimeType, 'size:', mediaBase64.length);
        const buffer = Buffer.from(mediaBase64, 'base64');
        
        if (buffer.length > 0) {
          // Determine file extension from mimetype
          const ext = (mediaMimeType || 'application/octet-stream').split('/')[1]?.split(';')[0] || 'bin';
          const fileName = `whatsapp-qr-inbound/${phoneNumber}/${Date.now()}.${ext}`;
          
          // Upload to S3
          savedMediaUrl = await uploadToS3(buffer, fileName, {
            metadata: {
              'wa-message-id': messageId || 'unknown',
              'phone-number': phoneNumber,
              'media-type': type,
              'direction': 'inbound',
              'provider': 'qr-bridge'
            }
          });
          mimeType = mediaMimeType;
          console.log('[QR WEBHOOK MEDIA] ✅ Uploaded base64 media to S3:', savedMediaUrl);
        }
      } catch (uploadErr: any) {
        console.error('[QR WEBHOOK MEDIA] Error uploading base64 media:', uploadErr.message);
      }
    } else if (hasMedia && messageId && !savedMediaUrl) {
      // Fallback: try to fetch from bridge endpoint (legacy)
      const mediaResult = await fetchAndUploadMedia(messageId, phoneNumber, type || 'media');
      if (mediaResult) {
        savedMediaUrl = mediaResult.url;
        mimeType = mediaResult.mimeType;
      }
    }

    // Determine the message type
    const mappedType = mapMessageType(type || 'text');
    
    // For media without caption, use a descriptive placeholder
    const mediaLabel = type === 'image' ? '📷 Image' : type === 'video' ? '🎬 Video' : type === 'audio' ? '🎵 Audio' : type === 'document' ? '📄 Document' : type === 'sticker' ? '🎨 Sticker' : '📎 Media';
    const contentToStore = messageBody || (hasMedia ? mediaLabel : '');
    
    // Save the incoming message
    const savedMessage = await WhatsAppMessage.create({
      phoneNumber,
      leadId: lead._id,
      direction: 'inbound',
      messageContent: contentToStore,
      messageType: mappedType,
      hasMedia: hasMedia || false,
      // Store media info if available
      ...(savedMediaUrl && {
        media: {
          url: savedMediaUrl,
          mimeType: mimeType,
          type: type || 'media',
        }
      }),
      waMessageId: messageId,
      status: 'received',
      provider: 'whatsapp_web_bridge',
      sentAt: timestamp ? new Date(typeof timestamp === 'number' && timestamp > 1e12 ? timestamp : timestamp * 1000) : new Date(),
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
