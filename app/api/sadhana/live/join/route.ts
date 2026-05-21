import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

async function getLiveRoomCollection() {
  await connectDB();
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  return db.collection('sadhana_live_participants');
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, name, scheduleId } = await request.json();

    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    const col = await getLiveRoomCollection();
    const now = new Date();

    await col.updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          name: String(name).slice(0, 50),
          scheduleId: scheduleId || 'default',
          lastSeen: now,
        },
        $setOnInsert: { joinedAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, sessionId }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/join');
  }
}
