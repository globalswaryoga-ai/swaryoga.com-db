import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

/**
 * Send WhatsApp message via QR bridge
 * POST /api/admin/crm/whatsapp/send
 * 
 * This endpoint:
 * 1. Verifies admin auth
 * 2. Creates message record in DB
 * 3. Sends via WhatsApp Web bridge
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { leadId, phoneNumber, messageContent } = body;

    if (!leadId || !phoneNumber || !messageContent) {
      return NextResponse.json(
        { error: 'Missing: leadId, phoneNumber, messageContent' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const to = normalizePhone(String(phoneNumber));
    if (!to) {
      return NextResponse.json({ error: 'Invalid phoneNumber' }, { status: 400 });
    }

    // Create message record first
    const now = new Date();
    const message = await WhatsAppMessage.create({
      leadId,
      phoneNumber: to,
      messageContent: String(messageContent),
      direction: 'outbound',
      messageType: 'text',
      status: 'queued', // Will update after bridge sends
      sentAt: now,
    });

    // Send via bridge
    const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').replace(/\/+$/, '');
    if (!bridgeUrl) {
      return NextResponse.json(
        { error: 'WhatsApp bridge not configured' },
        { status: 400 }
      );
    }

    try {
      const bridgeRes = await fetch(`${bridgeUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: to,
          message: String(messageContent),
        }),
      });

      if (bridgeRes.ok) {
        // Update status to sent
        await WhatsAppMessage.findByIdAndUpdate(message._id, { status: 'sent' });
        return NextResponse.json({
          success: true,
          data: { messageId: message._id, status: 'sent' },
        });
      } else {
        // Bridge failed, but message is queued
        const err = await bridgeRes.json().catch(() => ({}));
        console.error('Bridge error:', err);
        return NextResponse.json({
          success: false,
          error: `Bridge error: ${err.error || 'Unknown error'}`,
          data: { messageId: message._id, status: 'queued' },
        }, { status: 500 });
      }
    } catch (bridgeError) {
      console.error('Bridge connection error:', bridgeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to WhatsApp bridge',
        data: { messageId: message._id, status: 'queued' },
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
