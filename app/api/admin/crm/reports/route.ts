import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import {
  getLead,
  getEmailLog,
  getWhatsAppMessage,
  getQrWhatsAppMessage,
  getTelegramMessage,
} from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function dateRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case 'week':    now.setDate(now.getDate() - 7); break;
    case 'quarter': now.setMonth(now.getMonth() - 3); break;
    case 'year':    now.setFullYear(now.getFullYear() - 1); break;
    case 'month':
    default:        now.setMonth(now.getMonth() - 1);
  }
  return now;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'month';
    const startDate = dateRange(range);
    const now = new Date();

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);

    // Scope filter: super admin sees all, tenant sees only their own
    const scopeFilter = superAdmin ? {} : { createdByUserId: viewerUserId };
    const dateFilter = { createdAt: { $gte: startDate, $lte: now } };
    const rangeFilter = { ...scopeFilter, ...dateFilter };

    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: 'DB not connected' }, { status: 500 });

    // ── Models ──
    const Lead = getLead();
    const EmailLog = getEmailLog();
    const WhatsAppMsg = getWhatsAppMessage();
    const QrMsg = getQrWhatsAppMessage();
    const TelegramMsg = getTelegramMessage();

    // ── Revenue from main DB orders ──
    const ordersCol = db.collection('orders');

    const [
      // Leads
      totalLeads,
      newLeads,
      interestedLeads,
      inProgressLeads,
      wonLeads,

      // Revenue
      revenueAgg,

      // Email
      emailSent,
      emailOpened,
      emailClicked,

      // QR broadcasts aggregate
      qrBroadcastAgg,

      // Messages
      metaWAOutbound,
      qrWAOutbound,
      telegramSent,

      // Chatbot (chatbot_flows collection)
    ] = await Promise.all([
      // Total leads in range
      Lead.countDocuments(rangeFilter),

      // New leads (status = new_lead)
      Lead.countDocuments({ ...rangeFilter, status: 'new_lead' }),

      // Interested leads
      Lead.countDocuments({ ...rangeFilter, status: { $in: ['interested', 'hot', 'prospect'] } }),

      // In-progress leads
      Lead.countDocuments({ ...rangeFilter, status: { $in: ['contacted', 'demo_trial', 'negotiation'] } }),

      // Won leads (closed_won stage or enrolled status)
      Lead.countDocuments({
        ...scopeFilter,
        $or: [
          { 'sales.stage': 'closed_won' },
          { status: { $in: ['enrolled', 'completed'] } },
        ],
        'sales.enrolledAt': { $gte: startDate, $lte: now },
      }).catch(() =>
        Lead.countDocuments({ ...rangeFilter, status: { $in: ['enrolled', 'completed'] } })
      ),

      // Revenue: sum of completed orders in date range
      ordersCol.aggregate([
        { $match: { paymentStatus: 'completed', createdAt: { $gte: startDate, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]).toArray(),

      // Email sent (all statuses except queued/failed)
      EmailLog.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startDate, $lte: now },
        status: { $in: ['sent', 'delivered', 'opened', 'clicked'] },
      }),

      // Email opened
      EmailLog.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startDate, $lte: now },
        status: { $in: ['opened', 'clicked'] },
      }),

      // Email clicked
      EmailLog.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startDate, $lte: now },
        status: 'clicked',
      }),

      // QR broadcasts aggregate (sum stats from broadcast_runs)
      db.collection('broadcast_runs').aggregate([
        {
          $match: {
            ...scopeFilter,
            createdAt: { $gte: startDate, $lte: now },
            provider: 'qr',
            status: { $in: ['completed', 'running'] },
          },
        },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: 1 },
            totalSent: { $sum: '$stats.sent' },
            totalDelivered: { $sum: '$stats.delivered' },
            totalRead: { $sum: '$stats.read' },
            totalFailed: { $sum: '$stats.failed' },
          },
        },
      ]).toArray(),

      // Meta WhatsApp outbound
      WhatsAppMsg.countDocuments({
        ...scopeFilter,
        direction: 'outbound',
        createdAt: { $gte: startDate, $lte: now },
      }),

      // QR WhatsApp outbound
      QrMsg.countDocuments({
        ...scopeFilter,
        direction: 'outbound',
        createdAt: { $gte: startDate, $lte: now },
      }),

      // Telegram sent
      TelegramMsg.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startDate, $lte: now },
      }),
    ]);

    // ── Chatbot conversations (chatbot_flows collection) ──
    const chatbotConversations = await db.collection('chatbot_flows')
      .countDocuments({ ...scopeFilter, createdAt: { $gte: startDate, $lte: now } })
      .catch(() => 0);

    // ── Derived stats ──
    const totalRevenue = revenueAgg[0]?.total || 0;
    const orderCount = revenueAgg[0]?.count || 0;
    const avgDealValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const conversionRate = totalLeads > 0 ? parseFloat(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

    const qrBroadcastStats = qrBroadcastAgg[0] || { totalRuns: 0, totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0 };
    const qrDeliveryRate = qrBroadcastStats.totalSent > 0
      ? parseFloat(((qrBroadcastStats.totalDelivered / qrBroadcastStats.totalSent) * 100).toFixed(1))
      : 0;

    const emailOpenRate = emailSent > 0 ? parseFloat(((emailOpened / emailSent) * 100).toFixed(1)) : 0;
    const emailClickRate = emailSent > 0 ? parseFloat(((emailClicked / emailSent) * 100).toFixed(1)) : 0;

    const totalMessages = metaWAOutbound + qrWAOutbound + telegramSent;
    const responseRate = 0; // Would need inbound/outbound ratio analysis

    const reports = {
      dateRange: range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),

      totalRevenue,
      conversionRate,
      avgDealValue,

      leads: {
        total: totalLeads,
        new: newLeads,
        interested: interestedLeads,
        inProgress: inProgressLeads,
        won: wonLeads,
        lost: Math.max(0, totalLeads - newLeads - interestedLeads - inProgressLeads - wonLeads),
      },

      email: {
        sent: emailSent,
        opens: emailOpened,
        openRate: emailOpenRate,
        clicks: emailClicked,
        clickRate: emailClickRate,
      },

      qrBroadcast: {
        runs: qrBroadcastStats.totalRuns,
        sent: qrBroadcastStats.totalSent,
        delivered: qrBroadcastStats.totalDelivered,
        read: qrBroadcastStats.totalRead,
        failed: qrBroadcastStats.totalFailed,
        deliveryRate: qrDeliveryRate,
      },

      messaging: {
        whatsappMeta: metaWAOutbound,
        whatsappQR: qrWAOutbound,
        telegram: telegramSent,
        total: totalMessages,
      },

      chatbot: {
        conversations: chatbotConversations,
        resolutionRate: 0,
        avgResponseTime: 0,
        satisfaction: 0,
      },
    };

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    console.error('[Reports] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
