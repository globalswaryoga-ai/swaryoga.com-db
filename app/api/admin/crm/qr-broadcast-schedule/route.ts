import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQRBroadcastSchedule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();
    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.messageText || !body.recipientChatIds?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, messageText, recipientChatIds' },
        { status: 400 }
      );
    }

    if (!body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'Time window required (startTime, endTime)' },
        { status: 400 }
      );
    }

    if (body.maxMessagesPerDay && (body.maxMessagesPerDay < 1 || body.maxMessagesPerDay > 300)) {
      return NextResponse.json(
        { error: 'maxMessagesPerDay must be 1-300' },
        { status: 400 }
      );
    }

    const schedule = await QRBroadcastSchedule.create({
      userId: decoded.userId,
      tenantId: decoded.tenantId || 'default',
      name: body.name,
      messageText: body.messageText,
      mediaUrls: body.mediaUrls || [],
      recipientChatIds: body.recipientChatIds,
      totalRecipients: body.recipientChatIds.length,
      groupIds: body.groupIds || [],
      individualIds: body.individualIds || [],
      isActive: body.isActive !== false,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone || 'Asia/Kolkata',
      frequency: body.frequency || 'once',
      daysOfWeek: body.daysOfWeek || [],
      maxMessagesPerDay: body.maxMessagesPerDay || 300,
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
      status: 'draft',
      createdBy: decoded.userId,
      description: body.description,
      tags: body.tags || [],
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    console.error('[QR Broadcast Schedule API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const QRBroadcastSchedule = getQRBroadcastSchedule();

    const schedules = await QRBroadcastSchedule.find(
      {
        userId: decoded.userId,
        tenantId: decoded.tenantId || 'default',
      },
      {},
      { sort: { createdAt: -1 }, lean: true }
    );

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error('[QR Broadcast Schedule API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
