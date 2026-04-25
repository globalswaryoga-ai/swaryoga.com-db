import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {

export const dynamic = 'force-dynamic';
  getLead,
  getWhatsAppMessage,
  getSalesReport,
  getLeadNote,
  getLeadFollowUp,
  getAuditLog,
} from '@/lib/schemas/enterpriseSchemas';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';


/**
 * Admin User Activity & Performance API
 * GET: Fetch admin user activity stats
 * 
 * Query params:
 * - userId: Specific admin user to view (super admin can view any, others only themselves)
 * - period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
 * - startDate: Start date for custom range
 * - endDate: End date for custom range
 * - view: 'summary' | 'detailed' | 'export'
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
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

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const SalesReport = getSalesReport();
    const LeadNote = getLeadNote();
    const LeadFollowUp = getLeadFollowUp();
    const AuditLog = getAuditLog();

    // Calculate date range based on period
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

    const dateFilter = { $gte: startDate, $lte: endDate };

    // Fetch all stats in parallel
    const [
      // Leads stats
      leadsCreated,
      leadsAssigned,
      leadsConverted,
      leadsByStatus,

      // WhatsApp activity
      messagesSent,
      messagesDelivered,
      messagesRead,
      messagesFailed,
      templatesSent,
      messagesByDay,

      // Notes and Followups
      notesAdded,
      followupsCreated,
      followupsCompleted,

      // Sales
      salesRecorded,
      totalSalesAmount,
      salesByStatus,

      // Login activity (from audit log)
      loginCount,
      lastLoginData,

      // Recent activity
      recentActions,
    ] = await Promise.all([
      // Leads created by this user
      Lead.countDocuments({ createdByUserId: targetUserId, createdAt: dateFilter }),
      // Leads assigned to this user
      Lead.countDocuments({ assignedToUserId: targetUserId, createdAt: dateFilter }),
      // Leads converted to customer by this user
      Lead.countDocuments({ 
        $or: [{ assignedToUserId: targetUserId }, { createdByUserId: targetUserId }],
        status: 'customer',
        updatedAt: dateFilter 
      }),
      // Leads by status
      Lead.aggregate([
        { $match: { $or: [{ assignedToUserId: targetUserId }, { createdByUserId: targetUserId }] } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Messages sent
      WhatsAppMessage.countDocuments({ 
        sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
        direction: 'outbound',
        sentAt: dateFilter 
      }),
      // Delivered
      WhatsAppMessage.countDocuments({ 
        sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
        direction: 'outbound',
        status: 'delivered',
        sentAt: dateFilter 
      }),
      // Read
      WhatsAppMessage.countDocuments({ 
        sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
        direction: 'outbound',
        status: 'read',
        sentAt: dateFilter 
      }),
      // Failed
      WhatsAppMessage.countDocuments({ 
        sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
        direction: 'outbound',
        status: 'failed',
        sentAt: dateFilter 
      }),
      // Templates sent
      WhatsAppMessage.countDocuments({ 
        sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
        direction: 'outbound',
        messageType: 'template',
        sentAt: dateFilter 
      }),
      // Messages by day
      WhatsAppMessage.aggregate([
        { 
          $match: { 
            sentByLabel: { $regex: new RegExp(targetUserId, 'i') },
            direction: 'outbound',
            sentAt: dateFilter 
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Notes added
      LeadNote.countDocuments({ createdByUserId: targetUserId, createdAt: dateFilter }),
      // Followups created
      LeadFollowUp.countDocuments({ createdByUserId: targetUserId, createdAt: dateFilter }),
      // Followups completed
      LeadFollowUp.countDocuments({ 
        createdByUserId: targetUserId, 
        status: 'completed',
        completedAt: dateFilter 
      }),

      // Sales recorded
      SalesReport.countDocuments({ reportedByUserId: targetUserId, saleDate: dateFilter }),
      // Total sales amount
      SalesReport.aggregate([
        { $match: { reportedByUserId: targetUserId, saleDate: dateFilter } },
        { $group: { _id: null, total: { $sum: '$saleAmount' } } },
      ]),
      // Sales by status
      SalesReport.aggregate([
        { $match: { reportedByUserId: targetUserId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$saleAmount' } } },
      ]),

      // Login count (from audit log)
      AuditLog.countDocuments({ 
        userId: targetUserId, 
        action: { $regex: /login/i },
        createdAt: dateFilter 
      }).catch(() => 0),
      // Last login
      AuditLog.findOne({ 
        userId: targetUserId, 
        action: { $regex: /login/i } 
      }).sort({ createdAt: -1 }).lean().catch(() => null),

      // Recent actions (notes, followups, messages, sales)
      Promise.all([
        LeadNote.find({ createdByUserId: targetUserId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('leadId', 'name phoneNumber leadNumber')
          .lean(),
        LeadFollowUp.find({ createdByUserId: targetUserId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('leadId', 'name phoneNumber leadNumber')
          .lean(),
        SalesReport.find({ reportedByUserId: targetUserId })
          .sort({ saleDate: -1 })
          .limit(5)
          .lean(),
      ]),
    ]);

    // Calculate summary stats
    const deliveryRate = messagesSent > 0 ? Math.round((messagesDelivered / messagesSent) * 100) : 0;
    const readRate = messagesSent > 0 ? Math.round((messagesRead / messagesSent) * 100) : 0;
    const conversionRate = leadsAssigned > 0 ? Math.round((leadsConverted / leadsAssigned) * 100) : 0;

    const activity = {
      userId: targetUserId,
      period,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },

      // Summary metrics
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
        totalSalesAmount: totalSalesAmount[0]?.total || 0,
        loginCount,
        lastLogin: lastLoginData?.createdAt || null,
      },

      // Breakdown data
      leadsByStatus: Object.fromEntries(
        leadsByStatus.map((s: any) => [s._id || 'unknown', s.count])
      ),
      salesByStatus: salesByStatus.map((s: any) => ({
        status: s._id || 'unknown',
        count: s.count,
        total: s.total,
      })),
      messagesByDay: messagesByDay.map((d: any) => ({
        date: d._id,
        count: d.count,
      })),

      // Recent activity
      recentActivity: {
        notes: recentActions[0] || [],
        followups: recentActions[1] || [],
        sales: recentActions[2] || [],
      },
    };

    // Export format
    if (view === 'export') {
      const csvLines = [
        'Metric,Value',
        `Period,${period}`,
        `Date Range,${startDate.toISOString().slice(0,10)} to ${endDate.toISOString().slice(0,10)}`,
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
        `Total Sales Amount,${totalSalesAmount[0]?.total || 0}`,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch admin activity';
    console.error('Admin activity API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
