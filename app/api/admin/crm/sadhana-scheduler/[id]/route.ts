import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import {
  getSadhanaSchedule,
  updateSadhanaSchedule,
  deleteSadhanaSchedule,
} from '@/lib/bunnySadhanaSchedulerRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/sadhana-scheduler/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await getSadhanaSchedule(params.id);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (!isSuperAdmin(decoded) && schedule.userId && schedule.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: schedule }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/[id]');
  }
}

/**
 * PUT /api/admin/crm/sadhana-scheduler/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getSadhanaSchedule(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (!isSuperAdmin(decoded) && existing.userId && existing.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await updateSadhanaSchedule(params.id, body);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'PUT sadhana-scheduler/[id]');
  }
}

/**
 * DELETE /api/admin/crm/sadhana-scheduler/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getSadhanaSchedule(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (!isSuperAdmin(decoded) && existing.userId && existing.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteSadhanaSchedule(params.id);
    return NextResponse.json({ success: true, message: 'Schedule deleted' }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-scheduler/[id]');
  }
}

/**
 * PATCH /api/admin/crm/sadhana-scheduler/[id]
 * Toggle status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getSadhanaSchedule(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const body = await request.json();
    const status = body.status === 'paused' ? 'paused' : 'active';
    const updated = await updateSadhanaSchedule(params.id, { status });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'PATCH sadhana-scheduler/[id]');
  }
}
