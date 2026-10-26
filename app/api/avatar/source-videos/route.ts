import { NextRequest, NextResponse } from 'next/server';
import {
  getSourceVideos,
  saveSourceVideo,
  updateSourceVideo,
  deleteSourceVideo,
} from '@/lib/avatarExtraction/avatarExtractionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const videos = await getSourceVideos();
    return NextResponse.json({ success: true, videos });
  } catch (error: any) {
    console.error('Source Videos GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch source videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, video, id } = body;

    if (action === 'delete') {
      const targetId = id || video?.id;
      const targetUrl = body.videoUrl || body.video_url || video?.videoUrl || video?.video_url;
      if (!targetId && !targetUrl) {
        return NextResponse.json({ success: false, error: 'Source video ID or videoUrl required' }, { status: 400 });
      }
      if (targetId) await deleteSourceVideo(targetId);
      if (targetUrl) await deleteSourceVideo(targetUrl);
      return NextResponse.json({ success: true, deletedId: targetId || targetUrl });
    }

    if (action === 'update' || action === 'edit') {
      const targetId = id || video?.id;
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Source video ID required' }, { status: 400 });
      }
      const updated = await updateSourceVideo(targetId, video || body);
      return NextResponse.json({ success: true, video: updated });
    }

    if (action === 'save' || action === 'add' || action === 'create' || !action) {
      const videoData = video || body;
      const name = videoData.name;
      const videoUrl = videoData.videoUrl || videoData.video_url;

      if (!name || !videoUrl) {
        return NextResponse.json(
          { success: false, error: 'Video name and video URL are required' },
          { status: 400 }
        );
      }
      const saved = await saveSourceVideo(videoData);
      return NextResponse.json({ success: true, video: saved });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Source Videos POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process source video' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Source video ID required' }, { status: 400 });
    }
    const updated = await updateSourceVideo(id, updates);
    return NextResponse.json({ success: true, video: updated });
  } catch (error: any) {
    console.error('Source Videos PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update source video' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Source video ID required' }, { status: 400 });
    }
    await deleteSourceVideo(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Source Videos DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete source video' },
      { status: 500 }
    );
  }
}
