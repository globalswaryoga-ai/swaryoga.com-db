import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb('swaryoga_admin_crm');
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, scheduleId } = await request.json();
    const db = await getDb();
    const participants = db.collection('sadhana_live_participants');
    const schedules = db.collection('sadhana_schedules');
    const chatCol = db.collection('sadhana_live_chat');

    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000);

    // Update heartbeat for this session
    if (sessionId) {
      await participants.updateOne(
        { sessionId },
        { $set: { lastSeen: now } }
      );
    }

    // Cleanup: remove participants not seen in 15s
    await participants.deleteMany({ lastSeen: { $lt: activeThreshold } });

    // Active participants
    const activeParticipants = await participants
      .find({ lastSeen: { $gte: activeThreshold } })
      .sort({ joinedAt: 1 })
      .limit(200)
      .toArray();

    // Active schedule (most recent active)
    let activeSchedule: any = null;
    if (scheduleId && scheduleId !== 'default') {
      try {
        activeSchedule = await schedules.findOne({
          _id: new mongoose.Types.ObjectId(scheduleId),
        });
      } catch {
        activeSchedule = null;
      }
    }
    if (!activeSchedule) {
      activeSchedule = await schedules.findOne(
        { status: 'active' },
        { sort: { updatedAt: -1 } }
      );
    }

    // Recent chat (last 50 messages)
    const chatMessages = await chatCol
      .find({ scheduleId: activeSchedule?._id?.toString() || 'default' })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      count: activeParticipants.length,
      participants: activeParticipants.map((p: any) => ({
        name: p.name,
        joinedAt: p.joinedAt,
      })),
      schedule: activeSchedule
        ? {
            id: activeSchedule._id.toString(),
            name: activeSchedule.name,
            videoUrl: activeSchedule.videoUrl,
            videoDuration: activeSchedule.videoDuration || 40,
          }
        : null,
      chat: chatMessages.reverse().map((m: any) => ({
        id: m._id.toString(),
        name: m.name,
        message: m.message,
        createdAt: m.createdAt,
      })),
      serverTime: now.toISOString(),
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/state');
  }
}
