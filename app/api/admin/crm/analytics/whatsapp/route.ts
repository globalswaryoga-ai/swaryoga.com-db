import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'overview';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const filterStart = startDate ? new Date(startDate) : defaultStart;
    const filterEnd = endDate ? new Date(endDate) : defaultEnd;
    
    // Add time boundary string for sqlite comparisons
    const filterStartStr = filterStart.toISOString();
    const filterEndStr = filterEnd.toISOString();

    const analytics: any = {};
    const superAdmin = isSuperAdmin(decoded);
    const viewerId = getViewerUserId(decoded);

    let accessibleLeadIds: string[] = [];
    if (!superAdmin) {
      const allLeads = await loadBunnyLeads();
      accessibleLeadIds = allLeads.filter(l => l.assignedToUserId === viewerId || l.createdByUserId === viewerId).map(l => String(l._id));
    }

    // Build base message scope clause
    const getMessageScope = () => {
      if (superAdmin) return "1=1"; // all
      if (!viewerId) return "1=0"; // none
      const leadIn = accessibleLeadIds.length > 0 ? `lead_id IN (${accessibleLeadIds.map(id => `'${id}'`).join(',')})` : "1=0";
      return `(${leadIn} OR sent_by_user_id = '${viewerId}' OR json_extract(data_json, '$.bridgeUserId') = '${viewerId}' OR json_extract(data_json, '$.ownerId') = '${viewerId}')`;
    };

    if (view === 'overview' || view === 'all') {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const scope = getMessageScope();
      
      const [
        totalSent,
        totalReceived,
        totalDelivered,
        totalRead,
        totalFailed,
        byProvider,
      ] = await Promise.all([
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='inbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='delivered' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='read' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='failed' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT provider, COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope} GROUP BY provider`, args: [currentMonthStart, currentMonthEnd] }),
      ]);

      analytics.overview = {
        currentMonth: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          monthName: now.toLocaleString('default', { month: 'long' }),
        },
        messages: {
          sent: totalSent.rows[0]?.c || 0,
          received: totalReceived.rows[0]?.c || 0,
          delivered: totalDelivered.rows[0]?.c || 0,
          read: totalRead.rows[0]?.c || 0,
          failed: totalFailed.rows[0]?.c || 0,
          deliveryRate: (totalSent.rows[0]?.c || 0) > 0 ? Math.round(((totalDelivered.rows[0]?.c || 0) / (totalSent.rows[0]?.c || 1)) * 100) : 0,
          readRate: (totalSent.rows[0]?.c || 0) > 0 ? Math.round(((totalRead.rows[0]?.c || 0) / (totalSent.rows[0]?.c || 1)) * 100) : 0,
        },
        byProvider: Object.fromEntries(byProvider.rows.map(r => [r.provider || 'unknown', r.c])),
        expenses: {
          byCategory: {},
          total: 0,
          marketing: 0,
          utility: 0,
          whatsapp_api: 0,
          templateMessages: 0,
        },
      };
    }

    if (view === 'daily' || view === 'all') {
      const scope = getMessageScope();
      const daily = await bunnyExecute({
        sql: `SELECT substr(COALESCE(sent_at,created_at), 1, 10) as date, 
              COUNT(*) as sent,
              SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read,
              SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
              FROM meta_messages_sql
              WHERE direction='outbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}
              GROUP BY substr(COALESCE(sent_at,created_at), 1, 10) ORDER BY date ASC`,
        args: [filterStartStr, filterEndStr]
      });
      analytics.daily = daily.rows;
    }

    // Additional views (weekly, monthly, yearly, by-admin) are mocked as empty arrays for now to prevent crashes
    // while keeping performance optimal, as requested by urgent unblocking.
    if (!analytics.weekly) analytics.weekly = [];
    if (!analytics.monthly) analytics.monthly = [];
    if (!analytics.yearly) analytics.yearly = [];
    if (!analytics.byAdmin) analytics.byAdmin = [];

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch WhatsApp analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
