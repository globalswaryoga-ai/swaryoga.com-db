/**
 * QR WhatsApp CSAT ratings.
 *
 * POST { chatJid } → send a "rate us 1–5" request to that chat and record it;
 *                    the contact's numeric reply is captured by the QR webhook.
 * GET  ?days=30    → rating stats (avg, distribution, per requesting agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getQrCsat } from '@/lib/schemas/enterpriseSchemas';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';
import { resolveQrBridgeSession, callQrBridge, normalizeChatJid, logQrOutboundMessage } from '@/lib/qrSpecialSend';

export const dynamic = 'force-dynamic';

const CSAT_MESSAGE =
  'How was your experience with us? 🙏\nPlease rate us by replying with a number:\n\n5 – Excellent 🌟\n4 – Good 😊\n3 – Okay 🙂\n2 – Poor 😕\n1 – Very poor 😞';

async function resolveCaller(req: NextRequest) {
  const decoded: any = verifyToken(req.headers.get('authorization') || '');
  if (!decoded || !decoded.isAdmin) return null;
  const userId = getViewerUserId(decoded);
  if (!userId) return null;

  let inboxOwnerUserId = userId;
  const tenantSlug = String(decoded.tenantSlug || '').trim();
  if (tenantSlug) {
    try {
      const Tenant = getTenantModel();
      const tenant: any = await Tenant.findOne({ slug: tenantSlug }, { ownerUserId: 1 }).lean();
      const owner = String(tenant?.ownerUserId || '').trim();
      if (owner) inboxOwnerUserId = owner;
    } catch { /* fall back */ }
  }
  return { userId, name: String(decoded.name || decoded.username || userId), inboxOwnerUserId };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const caller = await resolveCaller(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { chatJid } = await req.json();
    if (!chatJid) return NextResponse.json({ success: false, error: 'chatJid required' }, { status: 400 });
    if (String(chatJid).endsWith('@g.us')) {
      return NextResponse.json({ success: false, error: 'CSAT surveys are for individual chats, not groups' }, { status: 400 });
    }

    const session = await resolveQrBridgeSession(caller.inboxOwnerUserId);
    if (!session.hasOwnBridge) {
      return NextResponse.json({ success: false, error: 'No isolated WhatsApp session' }, { status: 403 });
    }

    const normalizedJid = normalizeChatJid(String(chatJid));
    const phone = normalizedJid.split('@')[0];

    const result = await callQrBridge(session, caller.inboxOwnerUserId, '/send', {
      to: normalizedJid,
      type: 'text',
      message: CSAT_MESSAGE,
    });

    if (result.status === 503) {
      return NextResponse.json({ success: false, error: 'WhatsApp QR not connected', needsQr: true }, { status: 200 });
    }
    if (!result.ok || result.data?.success === false) {
      return NextResponse.json({ success: false, error: result.data?.error || `Bridge returned ${result.status}` }, { status: 200 });
    }

    const messageId = result.data?.messageId || result.data?.id || '';
    await logQrOutboundMessage({
      userId: caller.inboxOwnerUserId,
      session,
      chatJid: normalizedJid,
      messageId,
      text: CSAT_MESSAGE,
      type: 'text',
    });

    const QrCsat = getQrCsat();
    await QrCsat.create({
      userId: caller.inboxOwnerUserId,
      phone,
      chatJid: normalizedJid,
      sentByUserId: caller.userId,
      sentByName: caller.name,
      sentAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[QR CSAT] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const caller = await resolveCaller(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const QrCsat = getQrCsat();
    const [stats]: any[] = await QrCsat.aggregate([
      { $match: { userId: caller.inboxOwnerUserId, sentAt: { $gte: since } } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                sent: { $sum: 1 },
                rated: { $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] } },
                avgRating: { $avg: '$rating' },
              },
            },
          ],
          distribution: [
            { $match: { rating: { $gte: 1 } } },
            { $group: { _id: '$rating', n: { $sum: 1 } } },
          ],
          perAgent: [
            { $match: { rating: { $gte: 1 } } },
            {
              $group: {
                _id: '$sentByUserId',
                name: { $last: '$sentByName' },
                responses: { $sum: 1 },
                avgRating: { $avg: '$rating' },
              },
            },
            { $sort: { responses: -1 } },
          ],
        },
      },
    ]);

    const totals = stats?.totals?.[0] || { sent: 0, rated: 0, avgRating: null };
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of stats?.distribution || []) distribution[d._id] = d.n;

    return NextResponse.json({
      success: true,
      days,
      sent: totals.sent,
      rated: totals.rated,
      responseRate: totals.sent > 0 ? Math.round((totals.rated / totals.sent) * 100) : null,
      avgRating: totals.avgRating !== null && totals.avgRating !== undefined ? Math.round(totals.avgRating * 100) / 100 : null,
      distribution,
      perAgent: (stats?.perAgent || []).map((a: any) => ({
        userId: a._id,
        name: a.name || a._id,
        responses: a.responses,
        avgRating: Math.round(a.avgRating * 100) / 100,
      })),
    });
  } catch (err: any) {
    console.error('[QR CSAT] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
