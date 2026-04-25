import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getFunnelStageHistory } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';
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
      .limit(50)
      .select('fromStage toStage changedByName note createdAt')
      .lean();

    return apiSuccess({ history });
  } catch (err: any) {
    console.error('[stage-history GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/funnel/stage-history
 * Add an update note to a lead's history.
 * Body: { leadId, note }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const { leadId, note } = await request.json();
    if (!leadId || !note?.trim()) return apiError('VALIDATION_ERROR', 'leadId and note are required');

    await connectDB();
    const FunnelStageHistory = getFunnelStageHistory();
    const viewerId = getViewerUserId(decoded);

    const entry = await FunnelStageHistory.create({
      leadId: new mongoose.Types.ObjectId(leadId),
      fromStage: '',
      toStage: '',
      changedByUserId: viewerId,
      changedByName: decoded.name || decoded.email || viewerId,
      note: note.trim(),
      metadata: { type: 'note' },
    });

    return apiSuccess({ entry: { _id: entry._id, note: entry.note, changedByName: entry.changedByName, createdAt: entry.createdAt } });
  } catch (err: any) {
    console.error('[stage-history POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
