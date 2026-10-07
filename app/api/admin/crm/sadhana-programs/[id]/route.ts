import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getProgram, updateProgram, deleteProgram, listProgramVideos } from '@/lib/bunnySadhanaRepository';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

async function authorizeProgramMutation(request: NextRequest, id: string): Promise<{ program: any } | { error: NextResponse }> {
  const decoded = verifyToken(request.headers.get('authorization')?.replace('Bearer ', '') || '');
  if (!decoded?.isAdmin && !decoded?.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 }) };
  }
  
  const program = await getProgram(id);
  if (!program) return { error: NextResponse.json({ error: 'Program not found' }, { status: 404 }) };
  
  if (!isSuperAdmin(decoded) && String(program.createdByUserId || '') !== getViewerUserId(decoded)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { program };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const program = await getProgram(params.id);
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const videos = await listProgramVideos(program.id);

    // Live Stats
    const now = new Date();
    const activeThreshold = new Date(now.getTime() - 15 * 1000).toISOString();
    
    let activeParticipants = 0;
    let chatMessages24h = 0;
    
    try {
      const partRes = await bunnyExecute({
        sql: 'SELECT COUNT(*) as c FROM sadhana_live_participants_sql WHERE program_slug = ? AND last_seen >= ?',
        args: [program.slug, activeThreshold]
      });
      activeParticipants = partRes.rows[0]?.c || 0;
      
      const chatRes = await bunnyExecute({
        sql: 'SELECT COUNT(*) as c FROM sadhana_live_chat_sql WHERE program_slug = ? AND created_at >= ?',
        args: [program.slug, new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()]
      });
      chatMessages24h = chatRes.rows[0]?.c || 0;
    } catch (e) {
      // Ignored if tables not created yet
    }

    return NextResponse.json({
      success: true,
      liveStats: {
        activeParticipants,
        chatMessages24h,
      },
      program,
      videos: videos.map((v: any) => ({
        id: v.id,
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
    
    const body = await request.json();
    const update: any = {};

    ['name', 'description', 'timezone', 'repeatFrequency', 'startDate', 'botName', 'botJoinMinutes', 'playerMode', 'playerUrl', 'zoomLink', 'zoomId', 'zoomPassword'].forEach((k) => {
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
    if (body.videoCalendar !== undefined) update.videoCalendar = body.videoCalendar || {};
    if (body.active !== undefined) update.active = !!body.active;

    await updateProgram(auth.program.id, update);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'PUT sadhana-programs/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeProgramMutation(request, params.id);
    if ('error' in auth) return auth.error;
    
    await deleteProgram(auth.program.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]');
  }
}
