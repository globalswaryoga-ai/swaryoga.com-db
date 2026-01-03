import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { WhatsAppWebhookEvent } from '@/lib/schemas/enterpriseSchemas';

/**
 * GET /api/admin/crm/whatsapp/webhook-events
 * Admin-only. Returns recent WhatsApp webhook event summaries.
 *
 * Query params:
 * - limit (default 50, max 200)
 * - kind (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get('limit') || 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));
    const kind = (url.searchParams.get('kind') || '').trim();

    await connectDB();

    const query: any = {};
    if (kind) query.kind = kind;

    const events = await WhatsAppWebhookEvent.find(query)
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, data: { events, limit } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
