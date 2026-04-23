import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

async function getChatCollection() {
  await connectDB();
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  return db.collection('sadhana_live_chat');
}

export async function POST(request: NextRequest) {
  try {
    const { name, message, scheduleId } = await request.json();

    if (!name || !message) {
      return NextResponse.json({ error: 'name and message required' }, { status: 400 });
    }

    const col = await getChatCollection();
    const now = new Date();

    const cleanMsg = String(message).slice(0, 300).trim();
    if (!cleanMsg) {
      return NextResponse.json({ error: 'empty message' }, { status: 400 });
    }

    await col.insertOne({
      name: String(name).slice(0, 50),
      message: cleanMsg,
      scheduleId: scheduleId || 'default',
      createdAt: now,
    });

    // Keep only last 200 messages per schedule
    const old = await col
      .find({ scheduleId: scheduleId || 'default' })
      .sort({ createdAt: -1 })
      .skip(200)
      .toArray();
    if (old.length > 0) {
      await col.deleteMany({ _id: { $in: old.map((m: any) => m._id) } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/chat');
  }
}
