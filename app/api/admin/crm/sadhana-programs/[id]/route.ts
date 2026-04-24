import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsCollection, getProgramVideosCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const col = await getProgramsCollection();
    const videosCol = await getProgramVideosCollection();
    let program: any = null;

    try {
      program = await col.findOne({ _id: new mongoose.Types.ObjectId(params.id) });
    } catch {
      program = await col.findOne({ slug: params.id });
    }

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const videos = await videosCol
      .find({ programId: program._id.toString() })
      .sort({ date: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      program: {
        id: program._id.toString(),
        slug: program.slug,
        name: program.name,
        description: program.description,
        timeSlots: program.timeSlots || (program.scheduleTime ? [program.scheduleTime] : []),
        timezone: program.timezone,
        videoDuration: program.videoDuration,
        countdownMinutes: program.countdownMinutes,
        days: program.days || [0, 1, 2, 3, 4, 5, 6],
        repeatFrequency: program.repeatFrequency || 'daily',
        startDate: program.startDate,
        botName: program.botName || '🤖 Swar Yoga Bot',
        botJoinMinutes: program.botJoinMinutes || 5,
        enableBotAutomation: program.enableBotAutomation !== false,
        active: program.active,
        createdAt: program.createdAt,
      },
      videos: videos.map((v: any) => ({
        id: v._id.toString(),
        date: v.date,
        title: v.title,
        videoUrl: v.videoUrl,
        order: v.order,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-programs/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const col = await getProgramsCollection();
    const body = await request.json();
    const update: any = { updatedAt: new Date() };

    ['name', 'description', 'timezone', 'repeatFrequency', 'startDate', 'botName'].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.timeSlots !== undefined) {
      const slots = Array.isArray(body.timeSlots) ? body.timeSlots : [body.timeSlots];
      update.timeSlots = slots.filter((s: string) => s.trim()).slice(0, 4);
    }
    if (body.videoDuration !== undefined) update.videoDuration = parseInt(body.videoDuration) || 40;
    if (body.countdownMinutes !== undefined) update.countdownMinutes = parseInt(body.countdownMinutes) || 3;
    if (body.days !== undefined) {
      update.days = Array.isArray(body.days) ? body.days.sort((a: number, b: number) => a - b) : [0, 1, 2, 3, 4, 5, 6];
    }
    if (body.botJoinMinutes !== undefined) update.botJoinMinutes = parseInt(body.botJoinMinutes) || 5;
    if (body.enableBotAutomation !== undefined) update.enableBotAutomation = !!body.enableBotAutomation;
    if (body.active !== undefined) update.active = !!body.active;

    await col.updateOne(
      { _id: new mongoose.Types.ObjectId(params.id) },
      { $set: update }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'PUT sadhana-programs/[id]');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const col = await getProgramsCollection();
    const videosCol = await getProgramVideosCollection();

    await col.deleteOne({ _id: new mongoose.Types.ObjectId(params.id) });
    await videosCol.deleteMany({ programId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]');
  }
}
