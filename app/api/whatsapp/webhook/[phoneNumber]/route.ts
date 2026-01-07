import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { handleInboundWhatsAppAutomations } from '@/lib/whatsappAutomation';
import { normalizePhone as normalizePhoneDigits } from '@/lib/whatsapp';

function normalizePhone(raw: string): string {
  return normalizePhoneDigits(raw);
}

function extractTextMessageBody(msg: any): string {
  const type = String(msg?.type || '');
  if (type === 'text') return String(msg?.text?.body || '').trim();
  return type ? `[${type} message]` : '';
}

type WebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: any[];
};

/**
 * Dynamic webhook handler for specific phone numbers
 * Route: /api/whatsapp/webhook/[phoneNumber]
 * Example: /api/whatsapp/webhook/9779006820
 * 
 * PHONE NUMBER ROUTING:
 * 
 * 1️⃣  Phone #1: 9779006820 (Meta Cloud API)
 *    URL: https://crm.swaryoga.com/api/whatsapp/webhook/9779006820
 *    Source: Meta Business Platform webhook
 *    Config: WHATSAPP_PHONE_NUMBER_ID = 733788303156745
 * 
 * 2️⃣  Phone #2: 9075358557 (QR Login / WhatsApp Web Bridge)
 *    URL: https://crm.swaryoga.com/api/whatsapp/webhook/9075358557
 *    Source: WhatsApp Web bridge service (EC2/local)
 *    Config: WHATSAPP_BRIDGE_PHONE_NUMBER = 9075358557
 * 
 * This route ensures messages from both sources go to the correct leads
 * and prevents overlapping/duplication between the two phone numbers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { phoneNumber: string } }
) {
  const phoneNumber = params.phoneNumber;
  console.log(`[WEBHOOK] 📞 Phone-specific webhook called for: ${phoneNumber}`);

  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      console.log('[WEBHOOK] ❌ PAYLOAD WAS NULL/EMPTY');
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    console.log('[WEBHOOK] ✅ PAYLOAD RECEIVED, processing...');
    const res = await handleWebhookPayload(payload, phoneNumber);
    res.headers.set('x-swar-webhook-route', 'whatsapp-webhook-phone-specific');
    res.headers.set('x-swar-webhook-phone', phoneNumber);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';
    console.error('[WEBHOOK] ❌ Processing failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Handle the webhook payload with phone number context
 */
async function handleWebhookPayload(payload: any, phoneNumberContext: string): Promise<NextResponse> {
  const entries: any[] = Array.isArray(payload?.entry) ? payload.entry : [];

  console.log('[WEBHOOK] Entries:', entries.length);

  if (entries.length === 0) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  await connectDB();

  // Verify database connection
  const readyState = mongoose.connection.readyState;
  const readyStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  console.log('[WEBHOOK] MongoDB connection state:', readyStateMap[readyState as keyof typeof readyStateMap]);

  if (readyState !== 1) {
    console.error('[WEBHOOK] ❌ MongoDB not connected!');
    return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
  }

  const db = mongoose.connection.db;
  if (!db) {
    console.error('[WEBHOOK] ❌ Database object unavailable');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  console.log('[WEBHOOK] ✅ Database connected');
  console.log('[WEBHOOK] Processing messages for phone context:', phoneNumberContext);

  const now = new Date();

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    console.log('[WEBHOOK] Entry has', changes.length, 'changes');

    for (const change of changes) {
      const value = change?.value;

      // Process status updates
      const statuses: WebhookStatus[] = Array.isArray(value?.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const waMessageId = String(st?.id || '').trim();
        if (!waMessageId) continue;

        const status = String(st?.status || '').toLowerCase();
        const update: any = { updatedAt: now };

        if (status === 'sent') update.status = 'sent';
        if (status === 'delivered') {
          update.status = 'delivered';
          update.deliveredAt = now;
        }
        if (status === 'read') {
          update.status = 'read';
          update.readAt = now;
        }

        await db.collection('whatsappmessages').updateOne(
          { waMessageId },
          { $set: update }
        );
      }

      // Process inbound messages
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      console.log('[WEBHOOK] Messages in this change:', messages.length);

      for (const msg of messages) {
        try {
          console.log('[WEBHOOK] Message:', JSON.stringify(msg).substring(0, 200));

          const from = normalizePhone(String(msg?.from || ''));
          console.log('[WEBHOOK] Normalized from:', from);

          if (!from) {
            console.log('[WEBHOOK] ⚠️  Skipping: no phone');
            continue;
          }

          const body = extractTextMessageBody(msg);
          console.log('[WEBHOOK] Body extracted:', body?.substring(0, 50));

          if (!body) {
            console.log('[WEBHOOK] ⚠️  Skipping: no body');
            continue;
          }

          const inboundWaMessageId = msg?.id ? String(msg.id).trim() : '';
          console.log('[WEBHOOK] Message ID:', inboundWaMessageId);

          // Ensure a Lead exists
          console.log('[WEBHOOK] 👤 Looking up lead for:', from);
          let lead = await db.collection('leads').findOne({ phoneNumber: from });

          if (!lead) {
            console.log('[WEBHOOK] ➕ Creating new lead for:', from);
            const leadResult = await db.collection('leads').insertOne({
              phoneNumber: from,
              source: 'whatsapp',
              status: 'lead',
              lastMessageAt: now,
              createdAt: now,
              updatedAt: now,
            });
            lead = { _id: leadResult.insertedId };
            console.log('[WEBHOOK] ✅ Created lead:', lead._id);
          } else {
            console.log('[WEBHOOK] ✅ Found existing lead:', lead._id);
            await db.collection('leads').updateOne(
              { _id: lead._id },
              { $set: { lastMessageAt: now, updatedAt: now } }
            );
          }

          if (!lead?._id) {
            console.log('[WEBHOOK] ❌ No lead ID, skipping');
            continue;
          }

          // Detect if this is the first inbound message
          const previousInbound = await db.collection('whatsappmessages').findOne({
            leadId: lead._id,
            direction: 'inbound',
          });
          const wasFirstInbound = !previousInbound;

          // Handle STOP/OPTOUT keywords
          const keyword = body.trim().toUpperCase();
          if (keyword === 'STOP' || keyword === 'UNSUBSCRIBE' || keyword === 'OPTOUT') {
            await ConsentManager.handleUnsubscribeKeyword(from, keyword as any);
          }

          // Store inbound message
          if (inboundWaMessageId) {
            console.log('[WEBHOOK] 💾 Upserting message:', inboundWaMessageId);
            try {
              const result = await db.collection('whatsappmessages').updateOne(
                { waMessageId: inboundWaMessageId, direction: 'inbound' },
                {
                  $setOnInsert: {
                    leadId: lead._id,
                    phoneNumber: from,
                    direction: 'inbound',
                    messageType: 'text',
                    messageContent: body,
                    status: 'delivered',
                    deliveredAt: now,
                    sentAt: now,
                    waMessageId: inboundWaMessageId,
                    isRead: false,
                    backgroundColor: '#22c55e',
                    textColor: '#ffffff',
                    borderRadius: '8px',
                    metadata: {
                      webhook: {
                        messageId: inboundWaMessageId,
                        timestamp: msg?.timestamp,
                        rawType: msg?.type,
                        phoneContext: phoneNumberContext,
                      },
                    },
                  },
                },
                { upsert: true }
              );
              console.log('[WEBHOOK] ✅ Message upserted - matched:', result?.matchedCount, 'upserted:', result?.upsertedCount);
            } catch (upsertErr) {
              const errMsg = upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
              console.error('[WEBHOOK] ❌ Upsert failed:', errMsg);
              throw upsertErr;
            }
          } else {
            console.log('[WEBHOOK] 💾 Creating message (no ID)');
            try {
              await db.collection('whatsappmessages').insertOne({
                leadId: lead._id,
                phoneNumber: from,
                direction: 'inbound',
                messageType: 'text',
                messageContent: body,
                status: 'delivered',
                deliveredAt: now,
                sentAt: now,
                isRead: false,
                backgroundColor: '#22c55e',
                textColor: '#ffffff',
                borderRadius: '8px',
                metadata: {
                  webhook: {
                    messageId: msg?.id,
                    timestamp: msg?.timestamp,
                    rawType: msg?.type,
                    phoneContext: phoneNumberContext,
                  },
                },
                createdAt: now,
                updatedAt: now,
              });
              console.log('[WEBHOOK] ✅ Message created');
            } catch (createErr) {
              const errMsg = createErr instanceof Error ? createErr.message : String(createErr);
              console.error('[WEBHOOK] ❌ Create failed:', errMsg);
              throw createErr;
            }
          }

          // Run automations
          handleInboundWhatsAppAutomations({
            leadId: lead._id,
            phoneNumber: from,
            messageBody: body,
            wasFirstInbound,
          }).catch(() => {});
        } catch (msgError) {
          const errMsg = msgError instanceof Error ? msgError.message : 'Unknown error';
          console.error('[WEBHOOK] ❌ Failed to process message:', errMsg);
        }
      }
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * GET handler for webhook verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { phoneNumber: string } }
) {
  const phoneNumber = params.phoneNumber;
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  console.log(`[WEBHOOK] 🔍 Verification request for phone ${phoneNumber}`);
  console.log(`[WEBHOOK] Mode: ${mode}, Token match: ${token === expectedToken}`);

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WEBHOOK] ✅ Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[WEBHOOK] ❌ Verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
