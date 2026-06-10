import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppMessage, getExpense, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * WhatsApp Analytics API
 * Provides detailed WhatsApp messaging stats:
 * - Daily, Weekly, Monthly, Yearly breakdowns
 * - By Admin User
 * - Combined with expense tracking
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();
    const Expense = getExpense();
    const Lead = getLead();

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'overview'; // overview, daily, weekly, monthly, yearly, by-admin
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const adminUserId = url.searchParams.get('adminUserId');

    // Default to current month if no dates specified
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const dateFilter: any = {
      $gte: startDate ? new Date(startDate) : defaultStart,
      $lte: endDate ? new Date(endDate) : defaultEnd,
    };

    const analytics: any = {};

    // ── Tenant isolation ──────────────────────────────────────────────
    // Super admin (CRM owner) sees ALL data. Every other admin is a tenant
    // and must only see their own usage — otherwise a brand-new tenant would
    // show the owner's month-to-date messages/spend in the header widget.
    const superAdmin = isSuperAdmin(decoded);
    const viewerId = getViewerUserId(decoded);

    let messageScope: Record<string, any> = {};
    let expenseScope: Record<string, any> = {};
    if (!superAdmin) {
      // Messages this tenant owns: tied to their leads, sent by them, or on
      // their QR session (matches the scoping used in /messages route).
      const accessibleLeads = await Lead.find({
        $or: [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }],
      })
        .select('_id')
        .lean();
      const accessibleIds = accessibleLeads.map((l: any) => l._id);
      messageScope = viewerId
        ? {
            $or: [
              { leadId: { $in: accessibleIds } },
              { sentByUserId: viewerId },
              { bridgeUserId: viewerId },
              { ownerId: viewerId },
            ],
          }
        : { _id: '__never_match__' };
      expenseScope = viewerId
        ? { createdByUserId: viewerId }
        : { _id: '__never_match__' };
    }

    // Combine a base query with a tenant scope without clobbering any existing
    // $or in the base (e.g. the marketing-cost aggregation already uses $or).
    const withScope = (
      base: Record<string, any>,
      scope: Record<string, any>,
    ): Record<string, any> =>
      Object.keys(scope).length === 0 ? base : { $and: [base, scope] };

    if (view === 'overview' || view === 'all') {
      // Get current month stats
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [
        totalSent,
        totalReceived,
        totalDelivered,
        totalRead,
        totalFailed,
        byProvider,
        monthlyExpenses,
        marketingFromMessages,
      ] = await Promise.all([
        WhatsAppMessage.countDocuments(withScope({
          direction: 'outbound',
          sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        }, messageScope)),
        WhatsAppMessage.countDocuments(withScope({
          direction: 'inbound',
          sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        }, messageScope)),
        WhatsAppMessage.countDocuments(withScope({
          direction: 'outbound',
          status: 'delivered',
          sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        }, messageScope)),
        WhatsAppMessage.countDocuments(withScope({
          direction: 'outbound',
          status: 'read',
          sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        }, messageScope)),
        WhatsAppMessage.countDocuments(withScope({
          direction: 'outbound',
          status: 'failed',
          sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
        }, messageScope)),
        WhatsAppMessage.aggregate([
          {
            $match: withScope({
              direction: 'outbound',
              sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
            }, messageScope),
          },
          { $group: { _id: '$provider', count: { $sum: 1 } } },
        ]),
        Expense.aggregate([
          {
            $match: withScope({
              expenseDate: { $gte: currentMonthStart, $lte: currentMonthEnd },
            }, expenseScope),
          },
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        // Aggregate marketing costs from template messages (Meta charges for all sent templates)
        // Include messages with metadata.cost OR messages with waMessageId (sent to Meta)
        WhatsAppMessage.aggregate([
          {
            $match: withScope({
              messageType: 'template',
              direction: 'outbound',
              provider: 'meta',
              $or: [
                { 'metadata.cost': { $exists: true, $gt: 0 } },
                { waMessageId: { $exists: true, $ne: null, $regex: /^wamid\./ } },
              ],
              sentAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
            }, messageScope),
          },
          {
            $group: {
              _id: null,
              // Use metadata.cost if available, otherwise estimate ₹0.70 per message
              total: { $sum: { $ifNull: ['$metadata.cost', 0.70] } },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      // Calculate marketing costs from both expenses collection AND message metadata
      const templateMarketingCost = (marketingFromMessages as any[])?.[0]?.total || 0;
      const templateMessageCount = (marketingFromMessages as any[])?.[0]?.count || 0;
      
      const expensesByCategory = Object.fromEntries(
        monthlyExpenses.map((e: any) => [e._id, { total: e.total, count: e.count }])
      );
      
      // Add template costs to marketing category
      const marketingFromExpenses = expensesByCategory.marketing?.total || 0;
      const totalMarketingCost = marketingFromExpenses + templateMarketingCost;
      
      const totalExpenses = monthlyExpenses.reduce((sum: number, e: any) => sum + e.total, 0) + templateMarketingCost;

      analytics.overview = {
        currentMonth: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          monthName: now.toLocaleString('default', { month: 'long' }),
        },
        messages: {
          sent: totalSent,
          received: totalReceived,
          delivered: totalDelivered,
          read: totalRead,
          failed: totalFailed,
          deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
          readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
        },
        byProvider: Object.fromEntries(byProvider.map((p: any) => [p._id || 'unknown', p.count])),
        expenses: {
          byCategory: expensesByCategory,
          total: totalExpenses,
          marketing: totalMarketingCost,
          utility: expensesByCategory.utility?.total || 0,
          whatsapp_api: expensesByCategory.whatsapp_api?.total || 0,
          templateMessages: templateMessageCount,
        },
      };
    }

    if (view === 'daily' || view === 'all') {
      const daily = await WhatsAppMessage.aggregate([
        {
          $match: withScope({
            direction: 'outbound',
            sentAt: dateFilter,
          }, messageScope),
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      analytics.daily = daily.map((d: any) => ({
        date: d._id,
        sent: d.sent,
        delivered: d.delivered,
        read: d.read,
        failed: d.failed,
      }));
    }

    if (view === 'weekly' || view === 'all') {
      const weekly = await WhatsAppMessage.aggregate([
        {
          $match: withScope({
            direction: 'outbound',
            sentAt: dateFilter,
          }, messageScope),
        },
        {
          $group: {
            _id: {
              year: { $year: '$sentAt' },
              week: { $week: '$sentAt' },
            },
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]);

      analytics.weekly = weekly.map((w: any) => ({
        year: w._id.year,
        week: w._id.week,
        sent: w.sent,
        delivered: w.delivered,
        read: w.read,
        failed: w.failed,
      }));
    }

    if (view === 'monthly' || view === 'all') {
      const monthly = await WhatsAppMessage.aggregate([
        {
          $match: withScope({
            direction: 'outbound',
            sentAt: {
              $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
              $lte: now,
            },
          }, messageScope),
        },
        {
          $group: {
            _id: {
              year: { $year: '$sentAt' },
              month: { $month: '$sentAt' },
            },
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Get monthly expenses too
      const monthlyExpenses = await Expense.aggregate([
        {
          $match: withScope({
            expenseDate: {
              $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
              $lte: now,
            },
          }, expenseScope),
        },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDate' },
              month: { $month: '$expenseDate' },
              category: '$category',
            },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      // Merge expenses into monthly data
      const expenseMap: Record<string, any> = {};
      for (const e of monthlyExpenses) {
        const key = `${e._id.year}-${e._id.month}`;
        if (!expenseMap[key]) expenseMap[key] = {};
        expenseMap[key][e._id.category] = e.total;
      }

      analytics.monthly = monthly.map((m: any) => {
        const key = `${m._id.year}-${m._id.month}`;
        const expenses = expenseMap[key] || {};
        return {
          year: m._id.year,
          month: m._id.month,
          monthName: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short' }),
          sent: m.sent,
          delivered: m.delivered,
          read: m.read,
          failed: m.failed,
          expenses: {
            marketing: expenses.marketing || 0,
            utility: expenses.utility || 0,
            whatsapp_api: expenses.whatsapp_api || 0,
            total: Object.values(expenses).reduce((sum: any, v: any) => sum + v, 0),
          },
        };
      });
    }

    if (view === 'yearly' || view === 'all') {
      const yearly = await WhatsAppMessage.aggregate([
        { $match: withScope({ direction: 'outbound' }, messageScope) },
        {
          $group: {
            _id: { $year: '$sentAt' },
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      analytics.yearly = yearly.map((y: any) => ({
        year: y._id,
        sent: y.sent,
        delivered: y.delivered,
        read: y.read,
        failed: y.failed,
      }));
    }

    if (view === 'by-admin' || view === 'all') {
      // Get messages sent by each admin (using sentByLabel or sentBy)
      const byAdmin = await WhatsAppMessage.aggregate([
        {
          $match: withScope({
            direction: 'outbound',
            sentAt: dateFilter,
          }, messageScope),
        },
        {
          $group: {
            _id: { $ifNull: ['$sentByLabel', 'Unknown'] },
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { sent: -1 } },
      ]);

      analytics.byAdmin = byAdmin.map((a: any) => ({
        adminUser: a._id,
        sent: a.sent,
        delivered: a.delivered,
        read: a.read,
        failed: a.failed,
        deliveryRate: a.sent > 0 ? Math.round((a.delivered / a.sent) * 100) : 0,
      }));
    }

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch WhatsApp analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
