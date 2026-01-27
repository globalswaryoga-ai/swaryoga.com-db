import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

/**
 * QR Bridge Webhook - receives incoming messages from the WhatsApp Web bridge
 * This is separate from Meta Cloud API webhook
 */

const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

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

    const { from, to, body: messageBody, timestamp, type, hasMedia, messageId } = body;

    if (!from || !messageBody) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no_from_or_body' });
    }

    // Skip status broadcasts
    if (from === 'status@broadcast') {
      return NextResponse.json({ success: true, skipped: true, reason: 'status_broadcast' });
    }

    // Skip @lid format (WhatsApp Link IDs) - these are internal IDs, not phone numbers
    // The bridge should ideally resolve these to actual phone numbers
    if (from.includes('@lid')) {
      console.log('[QR WEBHOOK] Skipping @lid format (not a phone number):', from);
      return NextResponse.json({ success: true, skipped: true, reason: 'lid_format_not_phone' });
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

    // Save the incoming message
    const savedMessage = await WhatsAppMessage.create({
      phoneNumber,
      leadId: lead._id,
      direction: 'inbound',
      messageContent: messageBody,
      messageType: type || 'text',
      hasMedia: hasMedia || false,
      waMessageId: messageId,
      status: 'received',
      provider: 'whatsapp_web_bridge',
      sentAt: timestamp ? new Date(timestamp * 1000) : new Date(),
    });

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
