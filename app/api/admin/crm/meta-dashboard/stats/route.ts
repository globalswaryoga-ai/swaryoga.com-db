import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin, getVisibleUserIds } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * Meta WhatsApp pricing rates (INR per message, as of 2025)
 * Source: Meta Business Platform pricing for India
 */
const META_PRICING_INR: Record<string, number> = {
  MARKETING: 3.3054,
  MARKETING_LITE: 3.3054,
  UTILITY: 1.00,
  AUTHENTICATION: 1.00,
  AUTHENTICATION_INTL: 2.93,
  SERVICE: 0, // Free within 24h customer service window
};

/**
 * Determine if a phone number is international (non-India)
 * India: starts with '91' followed by 10 digits
 * Nepal (977), etc. = international
 */
function isInternationalPhone(phone: string): boolean {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return false; // Bare 10-digit = India
  if (digits.startsWith('91') && digits.length === 12) return false; // 91XXXXXXXXXX = India
  return digits.length > 10; // Anything else with country code = international
}

/**
 * Meta Dashboard Stats API
 * 
 * Returns aggregated statistics for:
 * - Messages: received vs sent counts + delivered
 * - Message pricing: category breakdown, free/paid, charges
 * - Chat statuses: new, open, pending, overdue, closed
 * - User breakdown: stats by admin user
 * 
 * Query params:
 * - period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
 * - startDate: ISO date string (for custom)
 * - endDate: ISO date string (for custom)
 * - userId: filter by specific admin user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);
    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const userIdFilter = url.searchParams.get('userId');
    let startDate = url.searchParams.get('startDate');
    let endDate = url.searchParams.get('endDate');

    // Calculate date range based on period
    const now = new Date();
    if (period !== 'custom') {
      endDate = now.toISOString();
      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }
    }

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Build user filter for leads
    let leadUserFilter: any = {};
    if (userIdFilter) {
      // Specific user filter requested
      leadUserFilter = { assignedToUserId: userIdFilter };
    } else if (!superAdmin && visibleUserIds) {
      // Non-super admin can only see their own or team's data
      leadUserFilter = { assignedToUserId: { $in: visibleUserIds } };
    }

    // Build message filter
    const messageFilter: any = {
      provider: 'meta', // Only Meta messages
      ...(Object.keys(dateFilter).length > 0 ? { sentAt: dateFilter } : {}),
    };

    // Aggregate message stats
    const [messageStats, chatStatusStats, userStats, totalLeads, dailyTrend, deliveryStats, categoryBreakdown] = await Promise.all([
      // 1. Messages: sent vs received
      WhatsAppMessage.aggregate([
        { $match: messageFilter },
        {
          $group: {
            _id: '$direction',
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Chat status breakdown (24h WhatsApp window logic)
      // Uses lastInboundAt for timing: new=no inbound, open=0-12h, pending=12-23h, overdue=23-24h
      // Respects stored chatStatus='closed' from admin actions
      Lead.aggregate([
        { $match: leadUserFilter },
        {
          $addFields: {
            computedChatStatus: {
              $cond: {
                if: { $eq: ['$chatStatus', 'closed'] },
                then: 'closed',
                else: {
                  $cond: {
                    // No inbound message → new (broadcast sent, no reply)
                    if: { $eq: [{ $ifNull: ['$lastInboundAt', null] }, null] },
                    then: 'new',
                    else: {
                      $let: {
                        vars: {
                          hoursSinceInbound: {
                            $divide: [
                              { $subtract: [new Date(), { $ifNull: ['$lastInboundAt', '$lastMessageAt'] }] },
                              1000 * 60 * 60,
                            ],
                          },
                        },
                        in: {
                          $cond: {
                            if: { $gte: ['$$hoursSinceInbound', 24] },
                            then: 'new', // Window expired, treat as new
                            else: {
                              $cond: {
                                if: { $lt: ['$$hoursSinceInbound', 12] },
                                then: 'open',
                                else: {
                                  $cond: {
                                    if: { $lt: ['$$hoursSinceInbound', 23] },
                                    then: 'pending',
                                    else: 'overdue', // 23-24h
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$computedChatStatus',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 3. Stats by admin user
      Lead.aggregate([
        { $match: leadUserFilter },
        {
          $group: {
            _id: '$assignedToUserId',
            totalLeads: { $sum: 1 },
            withMessages: {
              $sum: { $cond: [{ $ifNull: ['$lastMessageAt', false] }, 1, 0] },
            },
          },
        },
        { $sort: { totalLeads: -1 } },
        { $limit: 20 },
      ]),

      // 4. Total leads count
      Lead.countDocuments(leadUserFilter),

      // 5. Daily message trend (last 7 days)
      WhatsAppMessage.aggregate([
        {
          $match: {
            provider: 'meta',
            sentAt: {
              $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
              direction: '$direction',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),

      // 6. Delivery status breakdown (sent vs delivered vs read vs failed)
      WhatsAppMessage.aggregate([
        { $match: { ...messageFilter, direction: 'outbound' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 7. Message category breakdown for pricing (outbound only, join with templates)
      WhatsAppMessage.aggregate([
        { $match: { ...messageFilter, direction: 'outbound' } },
        {
          $lookup: {
            from: 'whatsapp_templates',
            localField: 'templateId',
            foreignField: '_id',
            as: 'templateDoc',
          },
        },
        {
          $project: {
            phoneNumber: 1,
            messageType: 1,
            status: 1,
            templateCategory: {
              $cond: {
                if: { $eq: ['$messageType', 'template'] },
                then: {
                  $ifNull: [
                    { $arrayElemAt: ['$templateDoc.category', 0] },
                    'MARKETING',
                  ],
                },
                else: 'SERVICE',
              },
            },
          },
        },
        {
          $group: {
            _id: {
              category: '$templateCategory',
              status: '$status',
            },
            count: { $sum: 1 },
            phones: { $addToSet: '$phoneNumber' },
          },
        },
      ]),
    ]);

    // Format message stats
    const messages = {
      sent: messageStats.find((s: any) => s._id === 'outbound')?.count || 0,
      received: messageStats.find((s: any) => s._id === 'inbound')?.count || 0,
      total: messageStats.reduce((acc: number, s: any) => acc + s.count, 0),
    };

    // Format delivery stats
    const delivered = {
      total: 0,
      sent: 0, // sent but not yet delivered
      failed: 0,
    };
    for (const s of deliveryStats as any[]) {
      if (s._id === 'delivered' || s._id === 'read') delivered.total += s.count;
      else if (s._id === 'sent' || s._id === 'queued' || s._id === 'pending') delivered.sent += s.count;
      else if (s._id === 'failed') delivered.failed += s.count;
    }

    // ─── Build Meta-style pricing breakdown ───
    // Categorize: MARKETING, UTILITY, OTP/ACCOUNT_UPDATE→AUTHENTICATION, SERVICE
    // Detect international from phone numbers in each group
    const pricingCategories = {
      marketing: { delivered: 0, total: 0, international: 0 },
      marketingLite: { delivered: 0, total: 0, international: 0 },
      utility: { delivered: 0, total: 0, international: 0 },
      authentication: { delivered: 0, total: 0, international: 0 },
      authenticationIntl: { delivered: 0, total: 0 },
      service: { delivered: 0, total: 0, international: 0 },
    };

    for (const bucket of categoryBreakdown as any[]) {
      const cat = bucket._id?.category || 'SERVICE';
      const status = bucket._id?.status || '';
      const count = bucket.count || 0;
      const phones: string[] = bucket.phones || [];
      const isDelivered = ['delivered', 'read'].includes(status);

      // Count international phones in this bucket
      const intlCount = phones.filter((p: string) => isInternationalPhone(p)).length;
      // Rough per-message international estimate (proportional)
      const intlMsgEstimate = phones.length > 0 ? Math.round((intlCount / phones.length) * count) : 0;

      if (cat === 'MARKETING') {
        pricingCategories.marketing.total += count;
        if (isDelivered) pricingCategories.marketing.delivered += count;
        pricingCategories.marketing.international += intlMsgEstimate;
      } else if (cat === 'UTILITY') {
        pricingCategories.utility.total += count;
        if (isDelivered) pricingCategories.utility.delivered += count;
        pricingCategories.utility.international += intlMsgEstimate;
      } else if (cat === 'OTP' || cat === 'ACCOUNT_UPDATE') {
        pricingCategories.authentication.total += count;
        if (isDelivered) pricingCategories.authentication.delivered += count;
        pricingCategories.authentication.international += intlMsgEstimate;
        // International auth messages also tracked separately
        if (intlMsgEstimate > 0) {
          pricingCategories.authenticationIntl.total += intlMsgEstimate;
          if (isDelivered) pricingCategories.authenticationIntl.delivered += intlMsgEstimate;
        }
      } else if (cat === 'SERVICE') {
        pricingCategories.service.total += count;
        if (isDelivered) pricingCategories.service.delivered += count;
        pricingCategories.service.international += intlMsgEstimate;
      }
    }

    // Free messages = service (within 24h window)
    const freeMessages = {
      total: pricingCategories.service.delivered,
      freeCustomerService: pricingCategories.service.delivered,
      freeEntryPoint: 0, // We don't track click-to-WhatsApp ads entry separately
    };

    // Paid messages = all non-service delivered messages
    const paidMessages = {
      total: pricingCategories.marketing.delivered +
             pricingCategories.marketingLite.delivered +
             pricingCategories.utility.delivered +
             pricingCategories.authentication.delivered,
      marketing: pricingCategories.marketing.delivered,
      marketingLite: pricingCategories.marketingLite.delivered,
      utility: pricingCategories.utility.delivered,
      authentication: pricingCategories.authentication.delivered - pricingCategories.authenticationIntl.delivered,
      authenticationIntl: pricingCategories.authenticationIntl.delivered,
    };

    // Messages delivered by category (like Meta dashboard)
    const messagesDelivered = {
      total: delivered.total,
      marketing: pricingCategories.marketing.delivered,
      marketingLite: pricingCategories.marketingLite.delivered,
      utility: pricingCategories.utility.delivered,
      authentication: pricingCategories.authentication.delivered - pricingCategories.authenticationIntl.delivered,
      authenticationIntl: pricingCategories.authenticationIntl.delivered,
      service: pricingCategories.service.delivered,
    };

    // Calculate approximate charges (INR)
    const domesticMarketing = pricingCategories.marketing.delivered - pricingCategories.marketing.international;
    const intlMarketing = pricingCategories.marketing.international;
    const domesticUtility = pricingCategories.utility.delivered - pricingCategories.utility.international;
    const intlUtility = pricingCategories.utility.international;
    const domesticAuth = (pricingCategories.authentication.delivered - pricingCategories.authenticationIntl.delivered);
    const intlAuth = pricingCategories.authenticationIntl.delivered;

    const charges = {
      total: 0,
      marketing: +(domesticMarketing * META_PRICING_INR.MARKETING + intlMarketing * (META_PRICING_INR.MARKETING * 2.5)).toFixed(2),
      marketingLite: 0,
      utility: +(domesticUtility * META_PRICING_INR.UTILITY + intlUtility * (META_PRICING_INR.UTILITY * 3)).toFixed(2),
      authentication: +(domesticAuth * META_PRICING_INR.AUTHENTICATION).toFixed(2),
      authenticationIntl: +(intlAuth * META_PRICING_INR.AUTHENTICATION_INTL).toFixed(2),
    };
    charges.total = +(charges.marketing + charges.marketingLite + charges.utility + charges.authentication + charges.authenticationIntl).toFixed(2);

    // ── REAL billing (from Meta status webhooks) ──
    // Messages carry metadata.metaBilling captured from Meta's own pricing
    // payload: real conversation ids + billing categories. Meta bills per
    // CONVERSATION (24h window), so count distinct conversation ids per real
    // category — far more accurate than the per-message estimates above.
    let realBilling: any = null;
    try {
      const realAgg: any[] = await WhatsAppMessage.aggregate([
        { $match: { ...messageFilter, 'metadata.metaBilling.conversationId': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$metadata.metaBilling.conversationId',
            category: { $last: '$metadata.metaBilling.category' },
            billable: { $last: '$metadata.metaBilling.billable' },
            messages: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: { category: { $toLower: { $ifNull: ['$category', 'unknown'] } }, billable: '$billable' },
            conversations: { $sum: 1 },
            messages: { $sum: '$messages' },
          },
        },
      ]);

      if (realAgg.length > 0) {
        const byCategory: Record<string, { conversations: number; messages: number; billable: boolean }> = {};
        let realTotal = 0;
        for (const row of realAgg) {
          const cat = row._id.category || 'unknown';
          if (!byCategory[cat]) byCategory[cat] = { conversations: 0, messages: 0, billable: !!row._id.billable };
          byCategory[cat].conversations += row.conversations;
          byCategory[cat].messages += row.messages;
          if (row._id.billable) {
            const rate = META_PRICING_INR[cat.toUpperCase()] ?? 0;
            realTotal += row.conversations * rate;
          }
        }
        realBilling = {
          byCategory,
          estimatedChargesINR: +realTotal.toFixed(2),
          note: 'Counted from Meta-reported conversation ids and billing categories (per-conversation, as Meta bills)',
        };
      }
    } catch (billErr) {
      console.warn('[meta-dashboard] Real billing aggregation failed:', billErr instanceof Error ? billErr.message : billErr);
    }

    // Format chat status stats
    const chatStatuses = {
      new: chatStatusStats.find((s: any) => s._id === 'new')?.count || 0,
      open: chatStatusStats.find((s: any) => s._id === 'open')?.count || 0,
      pending: chatStatusStats.find((s: any) => s._id === 'pending')?.count || 0,
      overdue: chatStatusStats.find((s: any) => s._id === 'overdue')?.count || 0,
      closed: chatStatusStats.find((s: any) => s._id === 'closed')?.count || 0,
    };

    // Format user stats
    const users = userStats.map((u: any) => ({
      userId: u._id || 'Unassigned',
      totalLeads: u.totalLeads,
      withMessages: u.withMessages,
    }));

    // Format daily trend
    const trendMap: Record<string, { sent: number; received: number }> = {};
    dailyTrend.forEach((t: any) => {
      const date = t._id.date;
      if (!trendMap[date]) trendMap[date] = { sent: 0, received: 0 };
      if (t._id.direction === 'outbound') trendMap[date].sent = t.count;
      if (t._id.direction === 'inbound') trendMap[date].received = t.count;
    });

    const trend = Object.entries(trendMap)
      .map(([date, data]) => ({
        date,
        ...data,
        total: data.sent + data.received,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        messages,
        delivered,
        messagesDelivered,
        freeMessages,
        paidMessages,
        charges,
        realBilling,
        chatStatuses,
        totalLeads,
        users,
        trend,
      },
    });
  } catch (error) {
    console.error('[meta-dashboard/stats] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
