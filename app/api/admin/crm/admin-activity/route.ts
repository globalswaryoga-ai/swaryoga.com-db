import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || viewerUserId;
    const period = url.searchParams.get('period') || 'monthly';
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const view = url.searchParams.get('view') || 'summary';

    // Non-super admins can only view their own data
    if (!superAdmin && targetUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Can only view your own data' }, { status: 403 });
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Query stats in parallel from Bunny Database
    const [
      leadsStatsRes,
      leadsStatusRes,
      messagesRes,
      messagesByDayRes,
      notesRes,
      followupsRes,
      salesRes,
      loginRes,
      recentNotesRes,
      recentFollowupsRes,
      recentSalesRes,
    ] = await Promise.all([
      // Leads created, assigned, converted
      bunnyExecute({
        sql: `SELECT
                SUM(CASE WHEN json_extract(data_json, '$.createdByUserId') = ? THEN 1 ELSE 0 END) as created_count,
                SUM(CASE WHEN json_extract(data_json, '$.assignedToUserId') = ? THEN 1 ELSE 0 END) as assigned_count,
                SUM(CASE WHEN (json_extract(data_json, '$.assignedToUserId') = ? OR json_extract(data_json, '$.createdByUserId') = ?) AND json_extract(data_json, '$.status') = 'customer' THEN 1 ELSE 0 END) as converted_count
              FROM leads_sql
              WHERE created_at >= ? AND created_at <= ?`,
        args: [targetUserId, targetUserId, targetUserId, targetUserId, startIso, endIso],
      }).catch(() => ({ rows: [] })),

      // Leads by status
      bunnyExecute({
        sql: `SELECT json_extract(data_json, '$.status') as status, COUNT(*) as count
              FROM leads_sql
              WHERE (json_extract(data_json, '$.assignedToUserId') = ? OR json_extract(data_json, '$.createdByUserId') = ?)
              GROUP BY status`,
        args: [targetUserId, targetUserId],
      }).catch(() => ({ rows: [] })),

      // WhatsApp messages counts
      bunnyExecute({
        sql: `SELECT
                COUNT(*) as total_sent,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN message_type = 'template' THEN 1 ELSE 0 END) as template_count
              FROM meta_messages_sql
              WHERE direction = 'outbound'
                AND sent_at >= ? AND sent_at <= ?
                AND (sender_display_name LIKE ? OR json_extract(data_json, '$.sentBy') = ?)`,
        args: [startIso, endIso, `%${targetUserId}%`, targetUserId],
      }).catch(() => ({ rows: [] })),

      // Messages by day
      bunnyExecute({
        sql: `SELECT substr(sent_at, 1, 10) as day, COUNT(*) as count
              FROM meta_messages_sql
              WHERE direction = 'outbound'
                AND sent_at >= ? AND sent_at <= ?
                AND (sender_display_name LIKE ? OR json_extract(data_json, '$.sentBy') = ?)
              GROUP BY day
              ORDER BY day ASC`,
        args: [startIso, endIso, `%${targetUserId}%`, targetUserId],
      }).catch(() => ({ rows: [] })),

      // Notes count
      bunnyExecute({
        sql: `SELECT COUNT(*) as count FROM crm_lead_notes_sql WHERE created_by_user_id = ? AND created_at >= ? AND created_at <= ?`,
        args: [targetUserId, startIso, endIso],
      }).catch(() => ({ rows: [] })),

      // Followups count
      bunnyExecute({
        sql: `SELECT
                COUNT(*) as created_count,
                SUM(CASE WHEN status = 'done' OR status = 'completed' THEN 1 ELSE 0 END) as completed_count
              FROM crm_lead_followups_sql
              WHERE created_by_user_id = ? AND created_at >= ? AND created_at <= ?`,
        args: [targetUserId, startIso, endIso],
      }).catch(() => ({ rows: [] })),

      // Sales count and total amount
      bunnyExecute({
        sql: `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
              FROM orders_sql
              WHERE created_at >= ? AND created_at <= ? AND status IN ('success', 'completed', 'paid')`,
        args: [startIso, endIso],
      }).catch(() => ({ rows: [] })),

      // Login count
      bunnyExecute({
        sql: `SELECT COUNT(*) as count, MAX(created_at) as last_login
              FROM user_signins
              WHERE user_id = ? AND created_at >= ? AND created_at <= ?`,
        args: [targetUserId, startIso, endIso],
      }).catch(() => ({ rows: [] })),

      // Recent notes
      bunnyExecute({
        sql: `SELECT document_id as _id, lead_id as leadId, note, created_at as createdAt
              FROM crm_lead_notes_sql
              WHERE created_by_user_id = ?
              ORDER BY created_at DESC
              LIMIT 5`,
        args: [targetUserId],
      }).catch(() => ({ rows: [] })),

      // Recent followups
      bunnyExecute({
        sql: `SELECT document_id as _id, lead_id as leadId, title, due_at as dueAt, status, created_at as createdAt
              FROM crm_lead_followups_sql
              WHERE created_by_user_id = ?
              ORDER BY created_at DESC
              LIMIT 5`,
        args: [targetUserId],
      }).catch(() => ({ rows: [] })),

      // Recent sales
      bunnyExecute({
        sql: `SELECT document_id as _id, amount, status, created_at as saleDate, json_extract(data_json, '$.workshopName') as workshopName
              FROM orders_sql
              ORDER BY created_at DESC
              LIMIT 5`,
        args: [],
      }).catch(() => ({ rows: [] })),
    ]);

    const leadStatsRow = leadsStatsRes.rows[0] || {};
    const leadsCreated = Number(leadStatsRow.created_count || 0);
    const leadsAssigned = Number(leadStatsRow.assigned_count || 0);
    const leadsConverted = Number(leadStatsRow.converted_count || 0);

    const msgRow = messagesRes.rows[0] || {};
    const messagesSent = Number(msgRow.total_sent || 0);
    const messagesDelivered = Number(msgRow.delivered_count || 0);
    const messagesRead = Number(msgRow.read_count || 0);
    const messagesFailed = Number(msgRow.failed_count || 0);
    const templatesSent = Number(msgRow.template_count || 0);

    const notesAdded = Number(notesRes.rows[0]?.count || 0);
    const followupsCreated = Number(followupsRes.rows[0]?.created_count || 0);
    const followupsCompleted = Number(followupsRes.rows[0]?.completed_count || 0);

    const salesRecorded = Number(salesRes.rows[0]?.count || 0);
    const totalSalesAmount = Number(salesRes.rows[0]?.total_amount || 0);

    const loginCount = Number(loginRes.rows[0]?.count || 0);
    const lastLogin = loginRes.rows[0]?.last_login || null;

    const deliveryRate = messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 100) : 0;
    const readRate = messagesSent > 0 ? Math.round((messagesRead / messagesSent) * 100) : 0;
    const conversionRate = leadsAssigned > 0 ? Math.round((leadsConverted / leadsAssigned) * 100) : 0;

    const activity = {
      userId: targetUserId,
      period,
      dateRange: { start: startIso, end: endIso },
      summary: {
        leadsCreated,
        leadsAssigned,
        leadsConverted,
        conversionRate,
        messagesSent,
        messagesDelivered,
        messagesRead,
        messagesFailed,
        deliveryRate,
        readRate,
        templatesSent,
        notesAdded,
        followupsCreated,
        followupsCompleted,
        salesRecorded,
        totalSalesAmount,
        loginCount,
        lastLogin,
      },
      leadsByStatus: Object.fromEntries(
        (leadsStatusRes.rows || []).map((s: any) => [s.status || 'unknown', Number(s.count || 0)])
      ),
      salesByStatus: [],
      messagesByDay: (messagesByDayRes.rows || []).map((d: any) => ({
        date: d.day,
        count: Number(d.count || 0),
      })),
      recentActivity: {
        notes: recentNotesRes.rows || [],
        followups: recentFollowupsRes.rows || [],
        sales: recentSalesRes.rows || [],
      },
    };

    if (view === 'export') {
      const csvLines = [
        'Metric,Value',
        `Period,${period}`,
        `Date Range,${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
        `Leads Created,${leadsCreated}`,
        `Leads Assigned,${leadsAssigned}`,
        `Leads Converted,${leadsConverted}`,
        `Conversion Rate,${conversionRate}%`,
        `Messages Sent,${messagesSent}`,
        `Messages Delivered,${messagesDelivered}`,
        `Delivery Rate,${deliveryRate}%`,
        `Messages Read,${messagesRead}`,
        `Read Rate,${readRate}%`,
        `Messages Failed,${messagesFailed}`,
        `Templates Sent,${templatesSent}`,
        `Notes Added,${notesAdded}`,
        `Followups Created,${followupsCreated}`,
        `Followups Completed,${followupsCompleted}`,
        `Sales Recorded,${salesRecorded}`,
        `Total Sales Amount,${totalSalesAmount}`,
        `Login Count,${loginCount}`,
      ];

      return new NextResponse(csvLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="admin_activity_${targetUserId}_${period}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: activity });
  } catch (error: any) {
    console.error('Admin activity API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin activity' }, { status: 500 });
  }
}
