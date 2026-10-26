import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

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
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'month';
    const startDate = dateRange(range);
    const now = new Date();

    const startIso = startDate.toISOString();
    const nowIso = now.toISOString();

    const superAdmin = isSuperAdmin(decoded, request);
    const viewerUserId = getViewerUserId(decoded);

    // Run parallel queries against Bunny SQL
    const [
      leadsStatsRes,
      revenueRes,
      emailSentRes,
      emailOpenedRes,
      emailClickedRes,
      qrBroadcastRes,
      metaMessagesRes,
      qrMessagesRes,
      chatbotRes,
    ] = await Promise.all([
      // 1. Leads counts
      bunnyExecute({
        sql: `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN json_extract(data_json, '$.status') = 'new_lead' THEN 1 ELSE 0 END) as new_leads,
          SUM(CASE WHEN json_extract(data_json, '$.status') IN ('interested', 'hot', 'prospect') THEN 1 ELSE 0 END) as interested,
          SUM(CASE WHEN json_extract(data_json, '$.status') IN ('contacted', 'demo_trial', 'negotiation') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN json_extract(data_json, '$.status') IN ('enrolled', 'completed') OR json_extract(data_json, '$.sales.stage') = 'closed_won' THEN 1 ELSE 0 END) as won
        FROM leads_sql
        WHERE created_at >= ? AND created_at <= ?
        ${!superAdmin ? 'AND (json_extract(data_json, "$.createdByUserId") = ? OR json_extract(data_json, "$.assignedToUserId") = ?)' : ''}`,
        args: !superAdmin ? [startIso, nowIso, viewerUserId, viewerUserId] : [startIso, nowIso],
      }).catch(() => ({ rows: [{ total: 0, new_leads: 0, interested: 0, in_progress: 0, won: 0 }] })),

      // 2. Orders Revenue
      bunnyExecute({
        sql: `SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as total
          FROM orders_sql
          WHERE (payment_status = 'completed' OR payment_status = 'PAID')
          AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ count: 0, total: 0 }] })),

      // 3. Email sent
      bunnyExecute({
        sql: `SELECT COUNT(*) as c FROM email_logs_sql WHERE status IN ('sent', 'delivered', 'opened', 'clicked') AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ c: 0 }] })),

      // 4. Email opened
      bunnyExecute({
        sql: `SELECT COUNT(*) as c FROM email_logs_sql WHERE status IN ('opened', 'clicked') AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ c: 0 }] })),

      // 5. Email clicked
      bunnyExecute({
        sql: `SELECT COUNT(*) as c FROM email_logs_sql WHERE status = 'clicked' AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ c: 0 }] })),

      // 6. QR Broadcast Runs
      bunnyExecute({
        sql: `SELECT
          COUNT(*) as totalRuns,
          COALESCE(SUM(CAST(json_extract(data_json, '$.stats.sent') AS INTEGER)), 0) as totalSent,
          COALESCE(SUM(CAST(json_extract(data_json, '$.stats.delivered') AS INTEGER)), 0) as totalDelivered,
          COALESCE(SUM(CAST(json_extract(data_json, '$.stats.read') AS INTEGER)), 0) as totalRead,
          COALESCE(SUM(CAST(json_extract(data_json, '$.stats.failed') AS INTEGER)), 0) as totalFailed
        FROM broadcast_runs_sql
        WHERE provider = 'qr' AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ totalRuns: 0, totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0 }] })),

      // 7. Meta Messages Outbound
      bunnyExecute({
        sql: `SELECT COUNT(*) as count FROM meta_messages_sql WHERE direction = 'outbound' AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ count: 0 }] })),

      // 8. QR Messages Outbound
      bunnyExecute({
        sql: `SELECT COUNT(*) as count FROM qr_whatsapp_messages_sql WHERE direction = 'outbound' AND created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ count: 0 }] })),

      // 9. Chatbot Runtime Events
      bunnyExecute({
        sql: `SELECT COUNT(*) as count FROM chatbot_runtime_events_sql WHERE created_at >= ? AND created_at <= ?`,
        args: [startIso, nowIso],
      }).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const leadRow: any = leadsStatsRes.rows[0] || {};
    const totalLeads = Number(leadRow.total || 0);
    const newLeads = Number(leadRow.new_leads || 0);
    const interestedLeads = Number(leadRow.interested || 0);
    const inProgressLeads = Number(leadRow.in_progress || 0);
    const wonLeads = Number(leadRow.won || 0);

    const revRow: any = revenueRes.rows[0] || {};
    const totalRevenue = Number(revRow.total || 0);
    const orderCount = Number(revRow.count || 0);
    const avgDealValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const conversionRate = totalLeads > 0 ? parseFloat(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

    const emailSent = Number(emailSentRes.rows[0]?.c || 0);
    const emailOpened = Number(emailOpenedRes.rows[0]?.c || 0);
    const emailClicked = Number(emailClickedRes.rows[0]?.c || 0);
    const emailOpenRate = emailSent > 0 ? parseFloat(((emailOpened / emailSent) * 100).toFixed(1)) : 0;
    const emailClickRate = emailSent > 0 ? parseFloat(((emailClicked / emailSent) * 100).toFixed(1)) : 0;

    const qrRow: any = qrBroadcastRes.rows[0] || {};
    const qrRuns = Number(qrRow.totalRuns || 0);
    const qrSent = Number(qrRow.totalSent || 0);
    const qrDelivered = Number(qrRow.totalDelivered || 0);
    const qrRead = Number(qrRow.totalRead || 0);
    const qrFailed = Number(qrRow.totalFailed || 0);
    const qrDeliveryRate = qrSent > 0 ? parseFloat(((qrDelivered / qrSent) * 100).toFixed(1)) : 0;

    const metaWAOutbound = Number(metaMessagesRes.rows[0]?.count || 0);
    const qrWAOutbound = Number(qrMessagesRes.rows[0]?.count || 0);
    const totalMessages = metaWAOutbound + qrWAOutbound;
    const chatbotConversations = Number(chatbotRes.rows[0]?.count || 0);

    const reports = {
      dateRange: range,
      startDate: startIso,
      endDate: nowIso,

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
        runs: qrRuns,
        sent: qrSent,
        delivered: qrDelivered,
        read: qrRead,
        failed: qrFailed,
        deliveryRate: qrDeliveryRate,
      },

      messaging: {
        whatsappMeta: metaWAOutbound,
        whatsappQR: qrWAOutbound,
        telegram: 0,
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
