import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { listEmailCampaigns } from '@/lib/emailBunnyRepository';
import { tenantFilter } from '@/lib/crm-handlers';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers and request.url

// GET /api/admin/crm/email/campaigns - List all email campaigns
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission only for admin users (basic plan users have default access)
    if (decoded?.isAdmin && !decoded?.isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view email campaigns');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const allCampaigns = await listEmailCampaigns();
    // In-memory filter since SQLite returns everything (pagination handled minimally or we can filter)
    let filtered = allCampaigns;
    if (status) filtered = filtered.filter(c => c.status === status);
    
    // Check tenant filter
    const tf = tenantFilter(decoded, 'createdBy');
    if (tf.createdBy) {
      filtered = filtered.filter(c => c.createdBy === tf.createdBy);
    }
    
    const total = filtered.length;
    const campaigns = filtered.slice(skip, skip + limit);

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
