import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { listFollowUpSequences, saveFollowUpSequence } from '@/lib/emailBunnyRepository';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    if (decoded?.isAdmin && !decoded?.isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'read')) {
      return apiError('FORBIDDEN', 'You do not have permission to view follow-up sequences');
    }

    const tf = tenantFilter(decoded, 'createdBy');

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    let sequences = await listFollowUpSequences();

    if (active !== null) {
      const isActive = active === 'true';
      sequences = sequences.filter(s => s.active === isActive);
    }
    
    if (tf.createdBy) {
      sequences = sequences.filter(s => s.createdBy === tf.createdBy);
    }

    return apiSuccess({
      sequences,
      count: sequences.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/followups] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch follow-up sequences');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    if (decoded?.isAdmin && !decoded?.isSuperAdmin && !hasPermission(decoded?.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage follow-up sequences');
    }

    const body = await request.json();
    const { name, trigger, steps, active } = body;

    if (!name || !trigger) {
      return apiError('VALIDATION_ERROR', 'Name and trigger are required');
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
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

    const tf = tenantFilter(decoded, 'createdBy');
    const allSequences = await listFollowUpSequences();

    const existing = allSequences.find(s => s.name === name && (!tf.createdBy || s.createdBy === tf.createdBy));
    if (existing) {
      return apiError('VALIDATION_ERROR', 'A follow-up sequence with this name already exists');
    }

    const sequence = await saveFollowUpSequence({
      name,
      trigger,
      steps,
      active: active !== false,
      createdBy: decoded.userId || decoded.username,
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
