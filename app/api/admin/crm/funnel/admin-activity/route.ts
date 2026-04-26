/**
 * Admin Activity API for Funnel Dashboard
 * GET - Get all admin users with their activity stats, online status
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import {
  getLead,
  getWhatsAppMessage,
  getFunnelStageHistory,
  getSalesReport,
  getAdminSession,
} from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
import { isSuperAdmin } from '@/lib/crm-handlers';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    if (!isSuperAdmin(decoded)) return apiError('FORBIDDEN', 'Super admin access required');

    await connectDB();
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    const FunnelStageHistory = getFunnelStageHistory();
    const SalesReport = getSalesReport();
    const AdminSession = getAdminSession();

    // Tenant isolation: scope to decoded user's tenant
    const tenantId = decoded.tenantId || decoded.userId || 'admin';
    const tf = { tenantId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all admin sessions scoped to tenant
    const sessions = await AdminSession.find(tf).sort({ lastActiveAt: -1 }).lean();

    // Get unique admin user IDs from leads
    const adminIds = await Lead.distinct('assignedToUserId', tf);
    const allAdminIds = new Set<string>();
    for (const id of adminIds) {
      if (id) allAdminIds.add(String(id));
    }
    for (const s of sessions) {
      if ((s as any).userId) allAdminIds.add(String((s as any).userId));
    }

    const adminActivities: any[] = [];

    for (const userId of allAdminIds) {
      // Find latest session
      const session = sessions.find((s: any) => s.userId === userId);

      // Today's stats from actual data
      const [
        todayLeads,
        todayMessages,
        todayStageChanges,
        todaySales,
        totalLeadsAssigned,
      ] = await Promise.all([
        Lead.countDocuments({ ...tf, createdByUserId: userId, createdAt: { $gte: today } }),
        WhatsAppMessage.countDocuments({
          ...tf,
          sentByLabel: userId,
          direction: 'outbound',
          sentAt: { $gte: today },
        }),
        FunnelStageHistory.countDocuments({ ...tf, changedByUserId: userId, createdAt: { $gte: today } }),
        SalesReport.countDocuments({ ...tf, reportedByUserId: userId, saleDate: { $gte: today } }),
        Lead.countDocuments({ ...tf, assignedToUserId: userId }),
      ]);

      adminActivities.push({
        userId,
        userName: (session as any)?.userName || userId,
        isOnline: (session as any)?.isOnline || false,
        loginAt: (session as any)?.loginAt,
        logoutAt: (session as any)?.logoutAt,
        lastActiveAt: (session as any)?.lastActiveAt,
        totalLeadsAssigned,
        todayStats: {
          leadsCreated: todayLeads,
          messagesSent: todayMessages,
          stageChanges: todayStageChanges,
          salesRecorded: todaySales,
        },
      });
    }

    // Sort: online first, then by last active
    adminActivities.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
    });

    return apiSuccess({ admins: adminActivities });
  } catch (err: any) {
    console.error('[Admin Activity GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
