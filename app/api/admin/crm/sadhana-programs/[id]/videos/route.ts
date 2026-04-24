import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramVideosCollection, getProgramsCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

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

    const videosCol = await getProgramVideosCollection();
    const programsCol = await getProgramsCollection();

    const updateData: any = {
      programId: params.id,
      date,
      title: title ? String(title).slice(0, 150) : '',
      order: order !== undefined ? parseInt(order) : undefined,
    };

    if (videoUrl) updateData.videoUrl = String(videoUrl);
    if (hlsUrl) updateData.hlsUrl = String(hlsUrl);

    await videosCol.updateOne(
      { programId: params.id, date },
      {
        $set: updateData,
      },
      { upsert: true }
    );

    // Also update the program's videoCalendar field for live API compatibility
    const calendarEntry: any = {
      title: title ? String(title).slice(0, 150) : '',
    };
    if (videoUrl) calendarEntry.videoUrl = String(videoUrl);
    if (hlsUrl) calendarEntry.hlsUrl = String(hlsUrl);

    await programsCol.updateOne(
      { _id: new mongoose.Types.ObjectId(params.id) },
      {
        $set: {
          [`videoCalendar.${date}`]: calendarEntry,
        },
      }
    );

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

    const videosCol = await getProgramVideosCollection();
    const programsCol = await getProgramsCollection();

    if (videoId) {
      const video = await videosCol.findOne({ _id: new mongoose.Types.ObjectId(videoId) });
      await videosCol.deleteOne({ _id: new mongoose.Types.ObjectId(videoId) });
      if (video) {
        await programsCol.updateOne(
          { _id: new mongoose.Types.ObjectId(params.id) },
          { $unset: { [`videoCalendar.${video.date}`]: 1 } }
        );
      }
    } else if (date) {
      await videosCol.deleteOne({ programId: params.id, date });
      await programsCol.updateOne(
        { _id: new mongoose.Types.ObjectId(params.id) },
        { $unset: { [`videoCalendar.${date}`]: 1 } }
      );
    } else {
      return NextResponse.json({ error: 'videoId or date required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]/videos');
  }
}
