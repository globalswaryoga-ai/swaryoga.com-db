import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import {
  getGroupMergeScheduleById,
  updateGroupMergeSchedule,
} from '@/lib/bunnyGroupMergeSchedulerRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/group-merge-scheduler/[id]
 * Get a specific group merge schedule from Bunny Database
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await getGroupMergeScheduleById(params.id);

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Check ownership
    if (schedule.userId !== decoded.userId && !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: schedule }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET group-merge-scheduler/[id]');
  }
}

/**
 * PUT/PATCH /api/admin/crm/group-merge-scheduler/[id]
 * Update a group merge schedule in Bunny Database
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const existing = await getGroupMergeScheduleById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existing.userId !== decoded.userId && !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updated = await updateGroupMergeSchedule(params.id, body);

    return NextResponse.json(
      { success: true, data: updated, message: '✅ Schedule updated' },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'PUT group-merge-scheduler/[id]');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return PUT(request, { params });
}

/**
 * DELETE /api/admin/crm/group-merge-scheduler/[id]
 * Archive a group merge schedule in Bunny Database
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await getGroupMergeScheduleById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (existing.userId !== decoded.userId && !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await updateGroupMergeSchedule(params.id, { status: 'archived' });

    return NextResponse.json(
      { success: true, message: '✅ Schedule archived' },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'DELETE group-merge-scheduler/[id]');
  }
}
