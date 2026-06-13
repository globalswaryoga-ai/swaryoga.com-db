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
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone || 'Asia/Kolkata',
      frequency: body.frequency || 'once',
      daysOfWeek: body.daysOfWeek || [],
      customScheduleDates: Array.isArray(body.customScheduleDates)
        ? body.customScheduleDates.map((d: string) => new Date(d + (String(d).includes('T') ? '' : 'T00:00:00+05:30')))
        : [],
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

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
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
