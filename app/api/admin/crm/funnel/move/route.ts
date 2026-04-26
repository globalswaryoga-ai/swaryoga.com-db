/**
 * Move Lead Between Funnel Stages
 * POST - Move a lead to a new funnel stage
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getLead, getFunnelStageHistory, getAnalyticsEvent } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    await connectDB();
    const Lead = getLead();
    const FunnelStageHistory = getFunnelStageHistory();
    const AnalyticsEvent = getAnalyticsEvent();

    const body = await request.json();
    const { leadId, toStage, note } = body;

    if (!leadId || !toStage) {
      return apiError('VALIDATION_ERROR', 'leadId and toStage are required');
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return apiError('NOT_FOUND', 'Lead not found');

    const fromStage = lead.funnelStage || 'new_lead';
    const viewerId = getViewerUserId(decoded);

    // Update lead
    lead.funnelStage = toStage;
    lead.funnelStageChangedAt = new Date();
    // Mark first touch if not yet touched
    if (!lead.firstTouchedAt) {
      lead.firstTouchedAt = new Date();
      lead.firstTouchedBy = viewerId;
    }
    await lead.save();

    // Log stage change history
    await FunnelStageHistory.create({
      leadId: lead._id,
      fromStage,
      toStage,
      changedByUserId: viewerId,
      changedByName: decoded.username || viewerId,
      note: note || '',
    });

    // Log analytics event
    await AnalyticsEvent.create({
      eventType: 'funnel_stage_changed',
      userId: decoded.userId,
      leadId: lead._id,
      funnelStage: toStage,
      value: { fromStage, toStage },
      metadata: { note },
    });

    return apiSuccess({
      lead: lead.toObject(),
      fromStage,
      toStage,
    });
  } catch (err: any) {
    console.error('[Funnel Move POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
