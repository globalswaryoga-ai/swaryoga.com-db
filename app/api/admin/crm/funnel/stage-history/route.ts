import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getFunnelStageHistory } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/funnel/stage-history?leadId=xxx
 * Returns stage change history for a single lead (most recent first, limit 20).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const leadId = request.nextUrl.searchParams.get('leadId');
    if (!leadId) return apiError('VALIDATION_ERROR', 'leadId is required');

    await connectDB();
    const FunnelStageHistory = getFunnelStageHistory();

    const history = await FunnelStageHistory.find({
      leadId: new mongoose.Types.ObjectId(leadId),
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('fromStage toStage changedByName note createdAt')
      .lean();

    return apiSuccess({ history });
  } catch (err: any) {
    console.error('[stage-history GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
