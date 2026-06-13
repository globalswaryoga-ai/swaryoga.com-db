import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/** Get consistent user ID from token (handles both admin and regular tokens) */
function getUserId(decoded: any): string {
  return decoded?.userId || decoded?.username || decoded?.id || 'admin';
}

/** Build filter for finding schedules owned by this user */
function ownerFilter(decoded: any) {
  const uid = getUserId(decoded);
  // Match by userId OR createdBy — covers both creation paths
  return { $or: [{ userId: uid }, { createdBy: uid }] };
}

const MIN_SCHEDULE_GAP_MINUTES = 15;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function toIstDateStr(d: Date | string): string {
  return new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();
}

/**
 * For 'custom' frequency schedules (recurring group messages on specific days),
 * make sure no two schedules fire within MIN_SCHEDULE_GAP_MINUTES of each other
 * on a shared date — push the requested start time forward in 15-min steps
 * until it clears every conflicting schedule.
 */
async function resolveStartTime(
  QRBroadcastSchedule: any,
  uid: string,
  excludeId: string | undefined,
  requestedStart: string,
  requestedDates: Date[]
): Promise<string> {
  const requestedDateSet = new Set(requestedDates.map(toIstDateStr));

  const filter: any = {
    $or: [{ userId: uid }, { createdBy: uid }],
    frequency: 'custom',
    isActive: true,
    status: { $in: ['scheduled', 'in-progress', 'paused'] },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await QRBroadcastSchedule.find(filter)
    .select('startTime customScheduleDates')
    .lean();

  const conflictMinutes: number[] = [];
  for (const s of existing) {
    if (!Array.isArray(s.customScheduleDates) || !s.startTime) continue;
    const overlaps = s.customScheduleDates.some((d: any) => requestedDateSet.has(toIstDateStr(d)));
    if (overlaps) conflictMinutes.push(timeToMinutes(s.startTime));
  }

  let candidate = timeToMinutes(requestedStart);
  for (let i = 0; i < 96; i++) {
    const hasConflict = conflictMinutes.some((c) => {
      const diff = Math.abs(candidate - c);
      return Math.min(diff, 1440 - diff) < MIN_SCHEDULE_GAP_MINUTES;
    });
    if (!hasConflict) break;
    candidate = (candidate + MIN_SCHEDULE_GAP_MINUTES) % 1440;
  }
  return minutesToTime(candidate);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Schedule name is required' }, { status: 400 });
    }
    if (!body.messageText?.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Time window required (startTime, endTime)' }, { status: 400 });
    }
    if (body.maxMessagesPerDay && (body.maxMessagesPerDay < 1 || body.maxMessagesPerDay > 300)) {
      return NextResponse.json({ error: 'maxMessagesPerDay must be 1-300' }, { status: 400 });
    }

    const uid = getUserId(decoded);
    const recipients = Array.isArray(body.recipientChatIds) ? body.recipientChatIds : [];

    const frequency = body.frequency || 'once';
    const customScheduleDates: Date[] = Array.isArray(body.customScheduleDates)
      ? body.customScheduleDates.map((d: string) => new Date(d + (String(d).includes('T') ? '' : 'T00:00:00+05:30')))
      : [];

    // Group Scheduler ('custom' frequency): keep at least a 15-minute gap between
    // any two recurring group schedules that share a send date — auto-shift the
    // start/end time forward in 15-min steps if the requested slot conflicts.
    let startTime = body.startTime;
    let endTime = body.endTime;
    let timeAdjusted = false;
    if (frequency === 'custom' && customScheduleDates.length > 0) {
      const resolvedStart = await resolveStartTime(QRBroadcastSchedule, uid, undefined, body.startTime, customScheduleDates);
      if (resolvedStart !== body.startTime) {
        const durationMin = ((timeToMinutes(body.endTime) - timeToMinutes(body.startTime)) + 1440) % 1440 || 30;
        startTime = resolvedStart;
        endTime = minutesToTime(timeToMinutes(resolvedStart) + durationMin);
        timeAdjusted = true;
      }
    }

    const schedule = await QRBroadcastSchedule.create({
      userId: uid,
      tenantId: decoded?.tenantId || 'default',
      name: body.name.trim(),
      messageText: body.messageText.trim(),
      mediaUrls: body.mediaUrls || [],
      recipientChatIds: recipients,
      totalRecipients: recipients.length,
      groupIds: body.groupIds || [],
      individualIds: body.individualIds || [],
      isActive: body.isActive !== false,
      startTime,
      endTime,
      timezone: body.timezone || 'Asia/Kolkata',
      frequency,
      daysOfWeek: body.daysOfWeek || [],
      customScheduleDates,
      maxMessagesPerDay: body.maxMessagesPerDay || 300,
      gapStrategy: body.gapStrategy || {
        initialGapMs: 7000,
        initialGapCount: 2,
        minGapMs: 45000,
        maxGapMs: 120000,
        ensureVariation: true,
        ensureJitter: true,
        jitterPercent: 15,
        preset: 'SAFE',
      },
      rateLimiting: body.rateLimiting || {
        enabled: true,
        minDelayMs: 3000,
        maxDelayMs: 15000,
        batchSize: 5,
        batchDelayMs: 30000,
      },
      randomization: body.randomization || {
        enabled: true,
        shuffleRecipients: true,
        randomizeTimings: true,
        jitterPercent: 15,
      },
      status: body.status || 'scheduled', // use requested status, default to 'scheduled' (not 'draft')
      createdBy: uid,
      description: body.description || '',
      tags: body.tags || [],
      // Save scheduled date as firstRunDate for 'once' frequency schedules
      // This lets the cron processor check if today is the correct date to send
      firstRunDate: body.scheduledDate
        ? new Date(body.scheduledDate + 'T00:00:00+05:30') // parse as IST midnight
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: { ...schedule.toObject(), timeAdjusted, requestedStartTime: body.startTime },
    }, { status: 201 });
  } catch (error) {
    console.error('[QR Broadcast Schedule POST] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';

    const filter: any = { ...ownerFilter(decoded) };
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const schedules = await QRBroadcastSchedule.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error('[QR Broadcast Schedule GET] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
