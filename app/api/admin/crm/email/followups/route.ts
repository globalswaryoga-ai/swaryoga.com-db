import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getFollowUpSequence } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';

// Mark as dynamic since this route uses request.headers and request.url
export const dynamic = 'force-dynamic';

// GET /api/admin/crm/email/followups - List all follow-up sequences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission
    if (!hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view follow-up sequences');
    }

    await connectDB();
    const FollowUpSequence = getFollowUpSequence();
    const tf = tenantFilter(decoded, 'createdBy');

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const filter: any = {};
    if (active !== null) {
      filter.active = active === 'true';
    }

    const sequences = await FollowUpSequence.find({ ...filter, ...tf })
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess({
      sequences,
      count: sequences.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/followups] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch follow-up sequences');
  }
}

// POST /api/admin/crm/email/followups - Create new follow-up sequence
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, trigger, steps, active } = body;

    // Validation
    if (!name || !trigger) {
      return apiError('VALIDATION_ERROR', 'Name and trigger are required');
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return apiError('VALIDATION_ERROR', 'At least one step is required');
    }

    // Validate steps
    for (const step of steps) {
      if (!step.subject || !step.body) {
        return apiError('VALIDATION_ERROR', 'Each step must have a subject and body');
      }
      if (step.delayDays === undefined && step.delayHours === undefined) {
        return apiError('VALIDATION_ERROR', 'Each step must have a delay (days or hours)');
      }
    }

    await connectDB();
    const FollowUpSequence = getFollowUpSequence();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check for duplicate sequence name
    const existing = await FollowUpSequence.findOne({ name, ...tf });
    if (existing) {
      return apiError('VALIDATION_ERROR', 'A follow-up sequence with this name already exists');
    }

    const sequence = await FollowUpSequence.create({
      name,
      trigger,
      steps,
      active: active !== false, // Default to true
      createdBy: decoded.userId || decoded.username,
      createdByUserId: getViewerUserId(decoded),
      stats: {
        totalExecutions: 0,
        completedExecutions: 0,
        activeExecutions: 0,
      },
    });

    return apiSuccess(
      {
        sequence,
        message: 'Follow-up sequence created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/admin/crm/email/followups] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to create follow-up sequence');
  }
}
