/**
 * POST /api/admin/crm/leads/cleanup-blocked
 * Deletes all leads with isBlocked=true from the database + their funnel history.
 * Cleans up existing blocked leads that accumulated before auto-delete was enabled.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { getLead, getFunnelStageHistory } = await import('@/lib/schemas/enterpriseSchemas');
    const Lead = getLead();
    const FunnelStageHistory = getFunnelStageHistory();

    // Find all blocked leads
    const blockedLeads = await Lead.find({ isBlocked: true }).select('_id phoneNumber waBlockedReason').lean();
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

    console.log(`🗑️ [CLEANUP-BLOCKED] Deleted ${leadResult.deletedCount} blocked leads + ${funnelDeleted} funnel records`);

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
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { getLead } = await import('@/lib/schemas/enterpriseSchemas');
    const Lead = getLead();

    const count = await Lead.countDocuments({ isBlocked: true });
    const sample = await Lead.find({ isBlocked: true })
      .select('phoneNumber name waBlockedReason waBlockedAt')
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, count, sample });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to count blocked leads' }, { status: 500 });
  }
}
