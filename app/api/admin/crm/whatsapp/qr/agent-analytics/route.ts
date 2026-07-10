/**
 * GET /api/admin/crm/whatsapp/qr/agent-analytics?days=7
 *
 * Team performance for the tenant's QR WhatsApp inbox:
 *  - per-agent: messages sent, distinct chats handled
 *  - first-response time: minutes from a chat's first inbound of the day to
 *    the first outbound reply after it (averaged over chat-days)
 *  - busiest hours: 24-bucket histogram of inbound messages (IST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppMessage, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';

export const dynamic = 'force-dynamic';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

async function resolveInboxOwner(decoded: any): Promise<string> {
  const userId = getViewerUserId(decoded);
  const tenantSlug = String(decoded?.tenantSlug || '').trim();
  if (tenantSlug) {
    try {
      const Tenant = getTenantModel();
      const tenant: any = await Tenant.findOne({ slug: tenantSlug }, { ownerUserId: 1 }).lean();
      const owner = String(tenant?.ownerUserId || '').trim();
      if (owner) return owner;
    } catch { /* fall through */ }
  }
  return userId;
}

export async function GET(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization') || '');
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const days = Math.min(90, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '7', 10) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceTs = Math.floor(since.getTime() / 1000);

    await connectDB();
    const ownerUserId = await resolveInboxOwner(decoded);

    // ── Per-agent outbound stats (whatsapp_messages carries sentByUserId) ──
    const WhatsAppMessage = getWhatsAppMessage();
    const perAgentAgg: any[] = await WhatsAppMessage.aggregate([
      {
        $match: {
          provider: 'whatsapp_web_bridge',
          direction: 'outbound',
          sentAt: { $gte: since },
          $or: [{ bridgeUserId: ownerUserId }, { ownerId: ownerUserId }],
          sentByUserId: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$sentByUserId',
          name: { $last: '$sentByLabel' },
          messagesSent: { $sum: 1 },
          chats: { $addToSet: '$phoneNumber' },
        },
      },
      { $project: { userId: '$_id', name: 1, messagesSent: 1, chatsHandled: { $size: '$chats' }, _id: 0 } },
      { $sort: { messagesSent: -1 } },
    ]);

    // ── Message flow for first-response + busiest hours ──
    const QrMsg = getQrWhatsAppMessage();
    const msgs: any[] = await QrMsg.find(
      { userId: ownerUserId, timestamp: { $gte: sinceTs } },
      { chatJid: 1, fromMe: 1, direction: 1, timestamp: 1 }
    )
      .sort({ timestamp: 1 })
      .limit(50000)
      .lean();

    const hourBuckets = new Array(24).fill(0);
    // chat-day → { firstInbound, firstReplyAfter }
    const chatDays = new Map<string, { inbound: number; reply: number | null }>();

    let totalInbound = 0;
    let totalOutbound = 0;

    for (const m of msgs) {
      if (m.chatJid === 'status@broadcast' || String(m.chatJid || '').endsWith('@g.us')) continue;
      const isInbound = m.fromMe === false || m.direction === 'inbound';
      const tsMs = (m.timestamp || 0) * 1000;
      const istDate = new Date(tsMs + IST_OFFSET_MS);
      const dayKey = `${m.chatJid}|${istDate.toISOString().slice(0, 10)}`;

      if (isInbound) {
        totalInbound++;
        hourBuckets[istDate.getUTCHours()]++;
        if (!chatDays.has(dayKey)) chatDays.set(dayKey, { inbound: tsMs, reply: null });
      } else {
        totalOutbound++;
        const entry = chatDays.get(dayKey);
        if (entry && entry.reply === null && tsMs >= entry.inbound) entry.reply = tsMs;
      }
    }

    const responseTimes: number[] = [];
    let answeredChatDays = 0;
    let unansweredChatDays = 0;
    for (const entry of chatDays.values()) {
      if (entry.reply !== null) {
        answeredChatDays++;
        responseTimes.push((entry.reply - entry.inbound) / 60000);
      } else {
        unansweredChatDays++;
      }
    }
    responseTimes.sort((a, b) => a - b);
    const avg = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null;
    const median = responseTimes.length ? responseTimes[Math.floor(responseTimes.length / 2)] : null;

    return NextResponse.json({
      success: true,
      days,
      summary: {
        totalInbound,
        totalOutbound,
        answeredChatDays,
        unansweredChatDays,
        avgFirstResponseMins: avg !== null ? Math.round(avg * 10) / 10 : null,
        medianFirstResponseMins: median !== null ? Math.round(median * 10) / 10 : null,
      },
      perAgent: perAgentAgg,
      busiestHoursIST: hourBuckets.map((count, hour) => ({ hour, count })),
    });
  } catch (err: any) {
    console.error('[QR AGENT-ANALYTICS] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
