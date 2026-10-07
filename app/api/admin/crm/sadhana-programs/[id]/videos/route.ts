import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgram, updateProgram, getProgramVideoByDate, insertProgramVideo, updateProgramVideo, getProgramVideoById, deleteProgramVideo } from '@/lib/bunnySadhanaRepository';

export const dynamic = 'force-dynamic';

function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, title, videoUrl, hlsUrl, order } = await request.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required (format: YYYY-MM-DD)' }, { status: 400 });
    }
    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    if (!videoUrl && !hlsUrl) {
      return NextResponse.json({ error: 'At least one URL (Player URL or HLS URL) is required' }, { status: 400 });
    }
    if (videoUrl && !isValidUrl(videoUrl)) {
      return NextResponse.json({ error: 'Player URL must be a valid HTTP(S) URL' }, { status: 400 });
    }
    if (hlsUrl && !isValidUrl(hlsUrl)) {
      return NextResponse.json({ error: 'HLS URL must be a valid HTTP(S) URL' }, { status: 400 });
    }

    const program = await getProgram(params.id);
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const updateData: any = {
      title: title ? String(title).slice(0, 150) : '',
      order: order !== undefined ? parseInt(order) : undefined,
    };
    if (videoUrl) updateData.videoUrl = String(videoUrl);
    if (hlsUrl) updateData.hlsUrl = String(hlsUrl);

    let existingVideo = await getProgramVideoByDate(program.id, date);
    if (existingVideo) {
      await updateProgramVideo(existingVideo.id, updateData);
    } else {
      await insertProgramVideo({
        programId: program.id,
        date,
        ...updateData
      });
    }

    // Also update the program's videoCalendar field for live API compatibility
    const calendarEntry: any = {
      title: title ? String(title).slice(0, 150) : '',
    };
    if (videoUrl) calendarEntry.videoUrl = String(videoUrl);
    if (hlsUrl) calendarEntry.hlsUrl = String(hlsUrl);

    const videoCalendar = program.videoCalendar || {};
    videoCalendar[date] = calendarEntry;

    await updateProgram(program.id, { videoCalendar });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-programs/[id]/videos');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    const date = url.searchParams.get('date');

    const program = await getProgram(params.id);
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (videoId) {
      const video = await getProgramVideoById(videoId);
      await deleteProgramVideo(videoId);
      if (video) {
        const videoCalendar = program.videoCalendar || {};
        delete videoCalendar[video.date];
        await updateProgram(program.id, { videoCalendar });
      }
    } else if (date) {
      const video = await getProgramVideoByDate(program.id, date);
      if (video) {
        await deleteProgramVideo(video.id);
        const videoCalendar = program.videoCalendar || {};
        delete videoCalendar[date];
        await updateProgram(program.id, { videoCalendar });
      }
    } else {
      return NextResponse.json({ error: 'videoId or date required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]/videos');
  }
}
