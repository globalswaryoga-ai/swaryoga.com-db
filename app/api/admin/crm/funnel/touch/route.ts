export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getViewerUserId } from '@/lib/crm-handlers';

/**
 * POST /api/admin/crm/funnel/touch
 * Mark a lead as "touched" by an admin (first interaction).
 * Body: { leadId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('Unauthorized', 401);

    const { leadId } = await req.json();
    if (!leadId) return apiError('leadId required', 400);

    await connectDB();
    const Lead = getLead();
    const viewerId = getViewerUserId(decoded);

    // Only set firstTouchedAt if not already set (atomic, avoids race conditions)
    const result = await Lead.updateOne(
      { _id: leadId, firstTouchedAt: null },
      { $set: { firstTouchedAt: new Date(), firstTouchedBy: viewerId } }
    );

    return apiSuccess({
      touched: result.modifiedCount > 0,
      alreadyTouched: result.modifiedCount === 0,
    });
  } catch (err: any) {
    return apiError(err.message || 'Failed to touch lead', 500);
  }
}
