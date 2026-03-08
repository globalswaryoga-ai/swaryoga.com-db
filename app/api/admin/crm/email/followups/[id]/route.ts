import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getFollowUpSequence } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter } from '@/lib/crm-handlers';

// PUT /api/admin/crm/email/followups/[id] - Update follow-up sequence
export async function PUT(
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

    const body = await request.json();
    const { name, trigger, steps, active } = body;

    await connectDB();
    const FollowUpSequence = getFollowUpSequence();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check if sequence exists
    const sequence = await FollowUpSequence.findOne({ _id: params.id, ...tf });
    if (!sequence) {
      return apiError('NOT_FOUND', 'Follow-up sequence not found');
    }

    // Check for duplicate name (excluding current sequence)
    if (name && name !== sequence.name) {
      const existing = await FollowUpSequence.findOne({ 
        name, 
        _id: { $ne: params.id },
        ...tf,
      });
      if (existing) {
        return apiError('VALIDATION_ERROR', 'A follow-up sequence with this name already exists');
      }
    }

    // Validate steps if provided
    if (steps && Array.isArray(steps)) {
      if (steps.length === 0) {
        return apiError('VALIDATION_ERROR', 'At least one step is required');
      }
      for (const step of steps) {
        if (!step.subject || !step.body) {
          return apiError('VALIDATION_ERROR', 'Each step must have a subject and body');
        }
        if (step.delayDays === undefined && step.delayHours === undefined) {
          return apiError('VALIDATION_ERROR', 'Each step must have a delay (days or hours)');
        }
      }
    }

    // Update sequence
    const updateData: any = {};
    if (name) updateData.name = name;
    if (trigger) updateData.trigger = trigger;
    if (steps) updateData.steps = steps;
    if (active !== undefined) updateData.active = active;

    const updatedSequence = await FollowUpSequence.findOneAndUpdate(
      { _id: params.id, ...tf },
      { $set: updateData },
      { new: true }
    );

    return apiSuccess({
      sequence: updatedSequence,
      message: 'Follow-up sequence updated successfully',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/crm/email/followups/[id]] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to update follow-up sequence');
  }
}

// DELETE /api/admin/crm/email/followups/[id] - Delete follow-up sequence

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';

export async function DELETE(
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

    // Delete sequence
    await FollowUpSequence.findOneAndDelete({ _id: params.id, ...tf });

    return apiSuccess({
      message: 'Follow-up sequence deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/crm/email/followups/[id]] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to delete follow-up sequence');
  }
}
