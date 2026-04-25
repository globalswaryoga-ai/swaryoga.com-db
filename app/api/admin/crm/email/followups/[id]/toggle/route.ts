import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getFollowUpSequence } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// POST /api/admin/crm/email/followups/[id]/toggle - Activate/deactivate follow-up sequence

// Mark as dynamic since this route uses request.headers or request.url

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission
    if (!hasPermission(decoded?.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage follow-up sequences');
    }

    await connectDB();
    const FollowUpSequence = getFollowUpSequence();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check if sequence exists
    const sequence = await FollowUpSequence.findOne({ _id: params.id, ...tf });
    if (!sequence) {
      return apiError('NOT_FOUND', 'Follow-up sequence not found');
    }

    // Toggle active status
    sequence.active = !sequence.active;
    await sequence.save();

    return apiSuccess({
      sequence,
      message: `Follow-up sequence ${sequence.active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/crm/email/followups/[id]/toggle] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to toggle follow-up sequence');
  }
}
