import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailCampaign } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// POST /api/admin/crm/email/campaigns/[id]/retry - Retry failed email campaign

// Mark as dynamic since this route uses request.headers or request.url

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission
    if (!hasPermission(decoded?.permissionsV2, 'email', 'send')) {
      return apiError('FORBIDDEN', 'You do not have permission to retry email campaigns');
    }

    await connectDB();
    const EmailCampaign = getEmailCampaign();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check if campaign exists
    const campaign = await EmailCampaign.findOne({ _id: params.id, ...tf });
    if (!campaign) {
      return apiError('NOT_FOUND', 'Email campaign not found');
    }

    // Only allow retry for failed campaigns
    if (campaign.status !== 'failed') {
      return apiError('VALIDATION_ERROR', 'Only failed campaigns can be retried');
    }

    // Update campaign status
    campaign.status = 'sending';
    await campaign.save();

    // TODO: Implement actual retry logic with email service
    // For now, mark as sent (in production, this would re-queue the campaign)
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    await campaign.save();

    return apiSuccess({
      campaign,
      message: 'Campaign retry initiated successfully',
    });
  } catch (error: any) {
    console.error('[POST /api/admin/crm/email/campaigns/[id]/retry] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to retry email campaign');
  }
}
