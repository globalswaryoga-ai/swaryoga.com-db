import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getProgramsCollection, getProgramVideosCollection, getProgramsDb } from '@/lib/sadhanaPrograms';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * Authenticate + authorize a mutation on a program. Returns the program doc, or a
 * NextResponse error to return. Super admin may touch any program; a tenant may
 * only touch programs they created (existing super-admin programs have no owner,
 * so tenants get 403 — their data is never disturbed).
 */
async function authorizeProgramMutation(request: NextRequest, id: string): Promise<{ program: any } | { error: NextResponse }> {
  const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
  if (!decoded?.isAdmin && !decoded?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 }) };
  }
  const col = await getProgramsCollection();
  let program: any = null;
  try {
    program = await col.findOne({ _id: new mongoose.Types.ObjectId(id) });
  } catch {
    program = await col.findOne({ slug: id });
  }
  if (!program) return { error: NextResponse.json({ error: 'Program not found' }, { status: 404 }) };
  if (!isSuperAdmin(decoded) && String(program.createdByUserId || '') !== getViewerUserId(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { program };
}

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

    const statsDb = await getProgramsDb();
    const participantsCol = statsDb.collection('sadhana_live_participants');
    const chatCol = statsDb.collection('sadhana_live_chat');
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000);

    const activeParticipants = await participantsCol.countDocuments({
      programSlug: program.slug,
      lastSeen: { $gte: activeThreshold },
    });

    const chatMessages24h = await chatCol.countDocuments({
      programSlug: program.slug,
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });

    return NextResponse.json({
      success: true,
      liveStats: {
        activeParticipants,
        chatMessages24h,
      },
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
        videoCalendar: program.videoCalendar || {},
        playerMode: program.playerMode || 'player',
        playerUrl: program.playerUrl || '',
        active: program.active,
        createdAt: program.createdAt,
      },
      videos: videos.map((v: any) => ({
        id: v._id.toString(),
        date: v.date,
        title: v.title,
        videoUrl: v.videoUrl,
        hlsUrl: v.hlsUrl,
        order: v.order,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-programs/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeProgramMutation(request, params.id);
    if ('error' in auth) return auth.error;
    const col = await getProgramsCollection();
    const body = await request.json();
    const update: any = { updatedAt: new Date() };

    ['name', 'description', 'timezone', 'repeatFrequency', 'startDate', 'botName', 'botJoinMinutes', 'playerMode', 'playerUrl'].forEach((k) => {
      if (body[k] !== undefined) update[k] = body[k];
    });
    if (body.enableBotAutomation !== undefined) update.enableBotAutomation = !!body.enableBotAutomation;
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
    if (body.videoCalendar !== undefined) update.videoCalendar = body.videoCalendar || {};
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeProgramMutation(request, params.id);
    if ('error' in auth) return auth.error;
    const col = await getProgramsCollection();
    const videosCol = await getProgramVideosCollection();

    await col.deleteOne({ _id: new mongoose.Types.ObjectId(params.id) });
    await videosCol.deleteMany({ programId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]');
  }
}
