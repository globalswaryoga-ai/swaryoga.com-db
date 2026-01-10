import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppWebhookEvent } from '@/lib/schemas/enterpriseSchemas';

function parseLimit(v: string | null, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

/**
 * GET /api/admin/crm/whatsapp/webhook-events
 * Admin-only. Returns recent WhatsApp webhook event summaries.
 *
 * Query params:
 * - limit (default 50, max 200)
 * - kind (optional)
 * - phoneNumberId (optional) filters events by Meta phone_number_id (stored in sample)
 * - since (optional ISO date) returns events received after this timestamp
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'), 50);
  const kind = (url.searchParams.get('kind') || '').trim();
  const phoneNumberId = (url.searchParams.get('phoneNumberId') || '').trim();
  const since = (url.searchParams.get('since') || '').trim();

    await connectDB();

    const query: any = {};
    if (kind) query.kind = kind;

    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(d.getTime())) {
        query.receivedAt = { $gt: d };
      }
    }

    if (phoneNumberId) {
      query.$or = [
        { 'sample.phone_number_id': phoneNumberId },
        { 'sample.phoneNumberId': phoneNumberId },
        { 'sample.metadata.phone_number_id': phoneNumberId },
      ];
    }

    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();
    const docs = await WhatsAppWebhookEvent.find(query)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      id: String(d._id),
      source: d.source,
      kind: d.kind,
      ok: d.ok,
      message: d.message,
      phoneNumber: d.phoneNumber,
      waMessageId: d.waMessageId,
      status: d.status,
      receivedAt: d.receivedAt,
      sample: d.sample,
    }));

    const res = NextResponse.json({ ok: true, items }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
