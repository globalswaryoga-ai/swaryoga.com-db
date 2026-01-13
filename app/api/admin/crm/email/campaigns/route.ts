import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailCampaign } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';

// GET /api/admin/crm/email/campaigns - List all email campaigns
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission (read permission is enough to view campaigns)
    if (!hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view email campaigns');
    }

    await connectDB();
    const EmailCampaign = getEmailCampaign();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const campaigns = await EmailCampaign.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await EmailCampaign.countDocuments(filter);

    return apiSuccess({
      campaigns,
      pagination: {
        total,
        limit,
        skip,
        hasMore: total > skip + limit,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/campaigns] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch email campaigns');
  }
}
