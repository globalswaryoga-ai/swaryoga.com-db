import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Inbound WhatsApp Web bridge -> CRM ingestion endpoint.
 *
 * ⚠️  DEPRECATED: This endpoint is for local WhatsApp Web bridge only.
 * ACTIVE SYSTEM: Meta API (/api/whatsapp/webhook) is the primary system.
 * EC2 Bridge should only be used if Meta API is unavailable.
 *
 * Security model:
 * - This is NOT a public endpoint.
 * - The local WhatsApp Web bridge (services/whatsapp-web/qrServer.js) calls it.
 * - Auth uses a shared secret header: X-WhatsApp-Bridge-Secret.
 *
 * Required env (set on the CRM server runtime, e.g. Vercel Project → Environment Variables):
 * - WHATSAPP_WEB_BRIDGE_SECRET (preferred) - CLEAR THIS TO DISABLE
 * - WHATSAPP_BRIDGE_SECRET (fallback) - CLEAR THIS TO DISABLE
 *
 * To disable this endpoint, clear both environment variables.
 */

export async function POST(request: NextRequest) {
  try {
    const secretCandidates: Array<[key: string, value: string | undefined]> = [
      ['WHATSAPP_WEB_BRIDGE_SECRET', process.env.WHATSAPP_WEB_BRIDGE_SECRET],
      // Back-compat / alternate naming that may exist in some deployments.
      ['WHATSAPP_BRIDGE_SECRET', process.env.WHATSAPP_BRIDGE_SECRET],
    ];

    const found = secretCandidates.find(([, value]) => (value || '').trim().length > 0);
    const expected = (found?.[1] || '').trim();
    const expectedKey = found?.[0] || null;

    if (!expected) {
      return NextResponse.json(
        {
          error: 'WHATSAPP_WEB_BRIDGE_SECRET is not set',
          debug: {
            ok: false,
            reason: 'missing_env',
            checkedKeys: secretCandidates.map(([k]) => k),
          },
        },
        { status: 500 }
      );
    }

    const provided = (request.headers.get('x-whatsapp-bridge-secret') || '').trim();
    if (!provided || provided !== expected) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          debug: {
            ok: false,
            reason: 'bad_secret',
            hasHeader: Boolean(provided),
            expectedKey,
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          debug: {
            ok: false,
            reason: 'invalid_json',
          },
        },
        { status: 400 }
      );

    const fromRaw = body.from;
    const text = body.body;
    const ts = body.timestamp;
    const waMessageId = body.waMessageId;

    const from = normalizePhone(String(fromRaw || ''));
    if (!from) {
      return NextResponse.json(
        {
          error: 'Missing/invalid: from',
          debug: {
            ok: false,
            reason: 'missing_from',
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find lead by phoneNumber; create if missing.
    let lead = await Lead.findOne({ phoneNumber: from });
    if (!lead) {
      lead = await Lead.create({
        phoneNumber: from,
        source: 'whatsapp',
        status: 'lead',
        labels: [],
        lastMessageAt: new Date(),
      });
    }

    // Idempotency guard: if this inbound WhatsApp messageId already exists, skip.
    if (waMessageId) {
      const existing = await WhatsAppMessage.findOne({ waMessageId: String(waMessageId) }).select('_id').lean();
      if (existing) {
        return NextResponse.json({
          success: true,
          data: { skipped: true, reason: 'duplicate_waMessageId' },
          debug: { ok: true },
        });
      }
    }

    const sentAt = ts ? new Date(Number(ts) * 1000) : new Date();

    const msgDoc = await WhatsAppMessage.create({
      leadId: lead._id,
      phoneNumber: from,
      direction: 'inbound',
      messageType: 'text',
      messageContent: typeof text === 'string' ? text : JSON.stringify(text ?? ''),
      status: 'delivered',
      waMessageId: waMessageId ? String(waMessageId) : undefined,
      sentAt,
      metadata: {
        source: 'whatsapp_web_bridge',
      },
    });

    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          lastMessageAt: sentAt,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: { leadId: String(lead._id), messageId: String(msgDoc._id) },
      debug: { ok: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[whatsapp-inbound] error:', message);
    return NextResponse.json(
      {
        error: message,
        debug: {
          ok: false,
          reason: 'exception',
        },
      },
      { status: 500 }
    );
  }
}
