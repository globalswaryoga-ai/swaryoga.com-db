import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import {
  listGroupMergeSchedules,
  createGroupMergeSchedule,
} from '@/lib/bunnyGroupMergeSchedulerRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/group-merge-scheduler
 * List all group merge schedules for the user from Bunny Database
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = !isSuperAdmin(decoded) ? decoded.userId : undefined;
    const schedules = await listGroupMergeSchedules(userId);

    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET group-merge-scheduler');
  }
}

/**
 * POST /api/admin/crm/group-merge-scheduler
 * Create a new group merge schedule in Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      targetGroupId,
      targetGroupName,
      sourceGroupIds,
      sourceGroupNames,
      totalParticipantsExpected,
      removeFromSource,
      schedule,
      mergeDurationMinutes,
      minDelayBetweenOpsMs,
      maxDelayBetweenOpsMs,
    } = body;

    // Validation
    if (!name || !targetGroupId || !sourceGroupIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, targetGroupId, sourceGroupIds' },
        { status: 400 }
      );
    }

    const newSchedule = await createGroupMergeSchedule({
      name,
      description,
      targetGroupId,
      targetGroupName,
      sourceGroupIds,
      sourceGroupNames,
      totalParticipantsExpected,
      removeFromSource: removeFromSource ?? false,
      schedule: {
        times: schedule?.times || ['09:00'],
        days: schedule?.days || [1, 2, 3, 4, 5],
        repeatFrequency: schedule?.repeatFrequency || 'weekly',
        startDate: schedule?.startDate || new Date().toISOString().split('T')[0],
        timezone: schedule?.timezone || 'Asia/Kolkata',
      },
      mergeDurationMinutes: mergeDurationMinutes || 120,
      minDelayBetweenOpsMs: minDelayBetweenOpsMs || 120000,
      maxDelayBetweenOpsMs: maxDelayBetweenOpsMs || 360000,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        data: newSchedule,
        message: `✅ Schedule "${name}" created. Will run at ${schedule?.times?.join(', ') || '09:00'} for ${mergeDurationMinutes || 120} minutes on selected days.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST group-merge-scheduler');
  }
}
