import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

function normalizePhone(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[\s\-()]/g, '');
}

function extractTextMessageBody(msg: any): string {
  const type = String(msg?.type || '');
  if (type === 'text') return String(msg?.text?.body || '').trim();
  // For now, store a compact representation for non-text.
  return type ? `[${type} message]` : '';
}

type WebhookStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: any[];
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set' },
      { status: 500 }
    );
  }

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    // Meta expects the raw challenge string.
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Meta sends events with object: 'whatsapp_business_account'.
    // We accept others too, but ignore unknown shapes safely.
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    if (entries.length === 0) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    await connectDB();

    const now = new Date();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;

        // 1) Status updates for messages we previously sent
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
          if (status === 'failed') {
            update.status = 'failed';
            const err = Array.isArray(st?.errors) ? st.errors[0] : undefined;
            const msg = err?.title || err?.message || err?.error_data?.details;
            update.failureReason = msg ? String(msg) : 'Failed';
          }

          await WhatsAppMessage.updateOne({ waMessageId }, { $set: update });
        }

        // 2) Inbound messages (from user to us)
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          const from = normalizePhone(String(msg?.from || ''));
          if (!from) continue;

          const body = extractTextMessageBody(msg);
          if (!body) continue;

          // Ensure a Lead exists
          let lead: { _id: unknown } | null = (await Lead.findOne({ phoneNumber: from }).lean()) as { _id: unknown } | null;
          if (!lead) {
            const created = await Lead.create({
              phoneNumber: from,
              source: 'whatsapp',
              status: 'lead',
              lastMessageAt: now,
            });
            lead = created.toObject() as { _id: unknown };
          } else {
            await Lead.updateOne({ _id: lead._id }, { $set: { lastMessageAt: now, updatedAt: now } });
          }

          if (!lead?._id) continue;

          // Handle STOP/OPTOUT keywords
          const keyword = body.trim().toUpperCase();
          if (keyword === 'STOP' || keyword === 'UNSUBSCRIBE' || keyword === 'OPTOUT') {
            await ConsentManager.handleUnsubscribeKeyword(from, keyword as any);
          }

          // Store inbound as a WhatsAppMessage record for a unified thread view.
          await WhatsAppMessage.create({
            leadId: lead._id,
            phoneNumber: from,
            direction: 'inbound',
            messageType: 'text',
            messageContent: body,
            status: 'delivered',
            deliveredAt: now,
            metadata: {
              webhook: {
                messageId: msg?.id,
                timestamp: msg?.timestamp,
                rawType: msg?.type,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handler error';

    // Avoid throwing here; webhook responses must be fast and resilient.
    console.error('WhatsApp webhook processing failed:', message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
