import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramVideosCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, title, videoUrl, order } = await request.json();

    if (!date || !videoUrl) {
      return NextResponse.json({ error: 'date and videoUrl required' }, { status: 400 });
    }

    const col = await getProgramVideosCollection();
    await col.updateOne(
      { programId: params.id, date },
      {
        $set: {
          programId: params.id,
          date,
          title: title ? String(title).slice(0, 150) : '',
          videoUrl: String(videoUrl),
          order: order !== undefined ? parseInt(order) : undefined,
        },
      },
      { upsert: true }
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

    const col = await getProgramVideosCollection();

    if (videoId) {
      await col.deleteOne({ _id: new mongoose.Types.ObjectId(videoId) });
    } else if (date) {
      await col.deleteOne({ programId: params.id, date });
    } else {
      return NextResponse.json({ error: 'videoId or date required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE sadhana-programs/[id]/videos');
  }
}
