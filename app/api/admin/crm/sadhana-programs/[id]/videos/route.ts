import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramVideosCollection, getProgramsCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, title, videoUrl, hlsUrl, order } = await request.json();

    if (!date || (!videoUrl && !hlsUrl)) {
      return NextResponse.json({ error: 'date and at least one URL (videoUrl or hlsUrl) required' }, { status: 400 });
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
    await programsCol.updateOne(
      { _id: new mongoose.Types.ObjectId(params.id) },
      {
        $set: {
          [`videoCalendar.${date}`]: {
            title: title ? String(title).slice(0, 150) : '',
            videoUrl: String(videoUrl),
          },
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
