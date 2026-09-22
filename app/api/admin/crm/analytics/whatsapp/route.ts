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
      
      // Default rate fallbacks for Meta India
      const defaultMarketingCost = parseFloat(process.env.META_MARKETING_COST_INR || process.env.META_TEMPLATE_COST_INR || '0.78');
      const defaultUtilityCost = parseFloat(process.env.META_UTILITY_COST_INR || '0.15');
      const defaultAuthCost = parseFloat(process.env.META_AUTH_COST_INR || '0.15');

      const [
        totalSent,
        totalReceived,
        totalDelivered,
        totalRead,
        totalFailed,
        byProvider,
        templateMessagesRes,
        manualExpensesRes,
      ] = await Promise.all([
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='inbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='delivered' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='read' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND status='failed' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope}`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({ sql: `SELECT provider, COUNT(*) as c FROM meta_messages_sql WHERE direction='outbound' AND COALESCE(sent_at,created_at) BETWEEN ? AND ? AND ${scope} GROUP BY provider`, args: [currentMonthStart, currentMonthEnd] }),
        bunnyExecute({
          sql: `SELECT document_id, message_type, status, data_json FROM meta_messages_sql 
                WHERE direction='outbound' 
                  AND status != 'failed' 
                  AND COALESCE(sent_at,created_at) BETWEEN ? AND ? 
                  AND (
                    message_type = 'template' 
                    OR json_extract(data_json, '$.templateId') IS NOT NULL
                    OR json_extract(data_json, '$.templateCategory') IS NOT NULL
                    OR json_extract(data_json, '$.cost') IS NOT NULL
                    OR json_extract(data_json, '$.templateHash') IS NOT NULL
                  )
                  AND ${scope}`,
          args: [currentMonthStart, currentMonthEnd]
        }),
        bunnyExecute({
          sql: `SELECT category, SUM(amount) as total, COUNT(*) as count 
                FROM expenses_sql 
                WHERE expense_date BETWEEN ? AND ? 
                GROUP BY category`,
          args: [currentMonthStart.slice(0, 10), currentMonthEnd.slice(0, 10)]
        }).catch(() => ({ rows: [] }))
      ]);

      let templateMarketingCost = 0;
      let templateUtilityCost = 0;
      let templateAuthCost = 0;
      let templateCount = 0;

      for (const row of templateMessagesRes.rows) {
        templateCount++;
        let d: any = {};
        try { d = JSON.parse(String(row.data_json || '{}')); } catch {}

        const cat = String(d.templateCategory || d.category || '').toUpperCase();
        const recordedCost = typeof d.cost === 'number' && d.cost > 0 
          ? d.cost 
          : (typeof d.metadata?.cost === 'number' && d.metadata.cost > 0 ? d.metadata.cost : null);

        if (cat === 'UTILITY') {
          templateUtilityCost += recordedCost ?? defaultUtilityCost;
        } else if (cat === 'AUTHENTICATION') {
          templateAuthCost += recordedCost ?? defaultAuthCost;
        } else {
          templateMarketingCost += recordedCost ?? defaultMarketingCost;
        }
      }

      const manualByCategory: Record<string, { total: number; count: number }> = {};
      for (const row of manualExpensesRes.rows) {
        const cat = String(row.category || '').toLowerCase();
        manualByCategory[cat] = {
          total: Number(row.total || 0),
          count: Number(row.count || 0),
        };
      }

      const totalMarketing = Math.round((templateMarketingCost + (manualByCategory['marketing']?.total || 0)) * 100) / 100;
      const totalUtility = Math.round((templateUtilityCost + templateAuthCost + (manualByCategory['utility']?.total || 0)) * 100) / 100;
      const totalWhatsappApi = Math.round((manualByCategory['whatsapp_api']?.total || 0) * 100) / 100;
      const totalExpenses = Math.round((totalMarketing + totalUtility + totalWhatsappApi) * 100) / 100;

      const sentCount = Number(totalSent.rows[0]?.c || 0);
      const receivedCount = Number(totalReceived.rows[0]?.c || 0);
      const deliveredCount = Number(totalDelivered.rows[0]?.c || 0);
      const readCount = Number(totalRead.rows[0]?.c || 0);
      const failedCount = Number(totalFailed.rows[0]?.c || 0);

      analytics.overview = {
        currentMonth: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          monthName: now.toLocaleString('default', { month: 'long' }),
        },
        messages: {
          sent: sentCount,
          received: receivedCount,
          delivered: deliveredCount,
          read: readCount,
          failed: failedCount,
          deliveryRate: sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0,
          readRate: sentCount > 0 ? Math.round((readCount / sentCount) * 100) : 0,
        },
        byProvider: Object.fromEntries(byProvider.rows.map(r => [r.provider || 'unknown', r.c])),
        expenses: {
          byCategory: {
            ...manualByCategory,
            marketing: { total: totalMarketing, count: templateCount + (manualByCategory['marketing']?.count || 0) },
            utility: { total: totalUtility, count: (manualByCategory['utility']?.count || 0) },
            whatsapp_api: { total: totalWhatsappApi, count: (manualByCategory['whatsapp_api']?.count || 0) },
          },
          total: totalExpenses,
          marketing: totalMarketing,
          utility: totalUtility,
          whatsapp_api: totalWhatsappApi,
          templateMessages: templateCount,
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

    if (view === 'monthly' || view === 'all') {
      const scope = getMessageScope();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const monthlyRes = await bunnyExecute({
        sql: `SELECT substr(COALESCE(sent_at,created_at), 1, 7) as ym,
                     COUNT(*) as sent,
                     SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
                     SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read,
                     SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
              FROM meta_messages_sql
              WHERE direction='outbound' AND COALESCE(sent_at,created_at) >= ? AND ${scope}
              GROUP BY substr(COALESCE(sent_at,created_at), 1, 7)
              ORDER BY ym DESC`,
        args: [sixMonthsAgo]
      });

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const defaultMarketingCost = parseFloat(process.env.META_MARKETING_COST_INR || process.env.META_TEMPLATE_COST_INR || '0.78');
      analytics.monthly = monthlyRes.rows.map(r => {
        const [yearStr, monthStr] = String(r.ym).split('-');
        const y = Number(yearStr);
        const m = Number(monthStr);
        const sentCount = Number(r.sent || 0);
        return {
          year: y,
          month: m,
          monthName: monthNames[m - 1] || String(r.ym),
          sent: sentCount,
          delivered: Number(r.delivered || 0),
          read: Number(r.read || 0),
          failed: Number(r.failed || 0),
          expenses: {
            marketing: analytics.overview?.expenses?.marketing || 0,
            utility: analytics.overview?.expenses?.utility || 0,
            whatsapp_api: analytics.overview?.expenses?.whatsapp_api || 0,
            total: analytics.overview?.expenses?.total || 0,
          }
        };
      });
    }

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
