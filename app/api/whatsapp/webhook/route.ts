import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import crypto from 'crypto';

/**
 * WhatsApp Meta Webhook Handler
 * Receives incoming messages from Meta Business Platform
 * 
 * Webhook URL: https://yourdomain.com/api/whatsapp/webhook
 * Verify Token: swaryoga_mata_web_app (from .env.local)
 */

// GET: Meta webhook verification (hub.challenge)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    console.log('🔍 WhatsApp Webhook Verification Request');
    console.log(`   Mode: ${mode}`);
    console.log(`   Token: ${token ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Challenge: ${challenge ? '✅ Present' : '❌ Missing'}`);

    // Verify the token
    if (mode === 'subscribe' && token === verifyToken && challenge) {
      console.log('✅ Webhook verification successful');
      return new NextResponse(challenge, { status: 200 });
    }

    console.log('❌ Webhook verification failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Receive incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      console.log('❌ Invalid JSON body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Verify webhook signature (optional but recommended)
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signature = request.headers.get('x-hub-signature-256');
      if (signature && !verifySignature(body, signature, appSecret)) {
        console.log('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
      }
    }

    console.log('📨 Incoming WhatsApp Webhook');

    // Connect to database
    await connectDB();

    // Process messages
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const value = change.value;

            // Handle incoming messages
            if (value.messages && Array.isArray(value.messages)) {
              for (const message of value.messages) {
                await handleIncomingMessage(message, value);
              }
            }

            // Handle message status updates
            if (value.statuses && Array.isArray(value.statuses)) {
              for (const status of value.statuses) {
                await handleMessageStatus(status);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * Handle incoming message from customer
 */
async function handleIncomingMessage(message: any, context: any) {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    const messageType = message.type || 'text';

    let messageContent = '';
    if (messageType === 'text' && message.text?.body) {
      messageContent = message.text.body;
    } else if (messageType === 'image' && message.image?.caption) {
      messageContent = `[Image] ${message.image.caption}`;
    } else if (messageType === 'document') {
      messageContent = `[Document] ${message.document?.filename || 'Attachment'}`;
    } else if (messageType === 'voice') {
      messageContent = '[Voice Message]';
    } else if (messageType === 'video') {
      messageContent = '[Video Message]';
    } else {
      messageContent = `[${messageType}]`;
    }

    console.log(`📱 Message from ${phoneNumber}: "${messageContent}"`);

    // Create or get lead
    let lead = await Lead.findOne({ phoneNumber }).lean();

    if (!lead) {
      console.log(`✅ Creating new lead for ${phoneNumber}`);
      lead = await Lead.create({
        phoneNumber,
        source: 'whatsapp',
        status: 'lead',
        lastMessageAt: new Date(Number(timestamp) * 1000),
      });
    } else {
      // Update last message time
      await Lead.updateOne(
        { _id: lead._id },
        { lastMessageAt: new Date(Number(timestamp) * 1000) }
      );
    }

    // Store message
    const newMessage = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber,
      direction: 'inbound',
      messageContent,
      messageType,
      status: 'delivered',
      waMessageId: messageId,
      sentAt: new Date(Number(timestamp) * 1000),
      metadata: {
        context: context.metadata,
      },
    });

    console.log(`✅ Message stored: ${newMessage._id}`);
  } catch (error) {
    console.error('❌ Error handling incoming message:', error);
  }
}

/**
 * Handle message status update (sent, delivered, read, failed)
 */
async function handleMessageStatus(status: any) {
  try {
    const messageId = status.id;
    const waStatus = status.status;
    const timestamp = status.timestamp;

    console.log(`📍 Status update - Message: ${messageId}, Status: ${waStatus}`);

    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
    };

    const dbStatus = statusMap[waStatus] || waStatus;

    const updateData: any = { status: dbStatus };
    if (waStatus === 'delivered') {
      updateData.deliveredAt = new Date(Number(timestamp) * 1000);
    } else if (waStatus === 'read') {
      updateData.readAt = new Date(Number(timestamp) * 1000);
    }

    const updated = await WhatsAppMessage.findOneAndUpdate(
      { waMessageId: messageId },
      { $set: updateData },
      { new: true }
    );

    if (updated) {
      console.log(`✅ Status updated: ${waStatus}`);
    }
  } catch (error) {
    console.error('❌ Error handling message status:', error);
  }
}

/**
 * Verify webhook signature from Meta
 */
function verifySignature(body: any, signature: string, appSecret: string): boolean {
  try {
    const expectedSignature = 'sha256=' + 
      crypto
        .createHmac('sha256', appSecret)
        .update(JSON.stringify(body))
        .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}
