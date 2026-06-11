/**
 * POST /api/admin/crm/leads/cleanup-blocked
 * Deletes the viewer's leads with isBlocked=true + their funnel history.
 * Cleans up existing blocked leads that accumulated before auto-delete was enabled.
 * Tenant-isolated: only ever touches leads owned by the calling admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getBearerToken } from '@/lib/adminAuth';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function authorize(request: NextRequest) {
  const decoded = verifyToken(getBearerToken(request));
  if (!decoded?.isAdmin || !getViewerUserId(decoded)) return null;
  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    const decoded = authorize(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { getLead, getFunnelStageHistory } = await import('@/lib/schemas/enterpriseSchemas');
    const Lead = getLead();
    const FunnelStageHistory = getFunnelStageHistory();

    // Find blocked leads — scoped to the viewer's own leads only. The super
    // admin is scoped too: never delete another tenant's data from here.
    const viewerId = getViewerUserId(decoded);
    const ownScope = {
      $or: [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }],
    };
    const blockedLeads = await Lead.find({ isBlocked: true, ...ownScope })
      .select('_id phoneNumber waBlockedReason')
      .lean();
    if (blockedLeads.length === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'No blocked leads found' });
    }

    const ids = blockedLeads.map((l: any) => l._id);

    // Delete leads
    const leadResult = await Lead.deleteMany({ _id: { $in: ids } });

    // Delete funnel history
    let funnelDeleted = 0;
    if (FunnelStageHistory) {
      const funnelResult = await FunnelStageHistory.deleteMany({ leadId: { $in: ids } });
      funnelDeleted = funnelResult.deletedCount;
    }

    console.log(`🗑️ [CLEANUP-BLOCKED] Deleted ${leadResult.deletedCount} blocked leads + ${funnelDeleted} funnel records for ${viewerId}`);

    return NextResponse.json({
      success: true,
      deleted: leadResult.deletedCount,
      funnelRecordsRemoved: funnelDeleted,
      phones: blockedLeads.map((l: any) => l.phoneNumber),
    });
  } catch (error) {
    console.error('cleanup-blocked error:', error);
    return NextResponse.json({ error: 'Failed to cleanup blocked leads' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = authorize(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { getLead } = await import('@/lib/schemas/enterpriseSchemas');
    const Lead = getLead();

    const viewerId = getViewerUserId(decoded);
    const ownScope = {
      $or: [{ assignedToUserId: viewerId }, { createdByUserId: viewerId }],
    };
    const count = await Lead.countDocuments({ isBlocked: true, ...ownScope });
    const sample = await Lead.find({ isBlocked: true, ...ownScope })
      .select('phoneNumber name waBlockedReason waBlockedAt')
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, count, sample });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to count blocked leads' }, { status: 500 });
  }
}
