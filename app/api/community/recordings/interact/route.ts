import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';


/**
 * POST /api/community/recordings/interact
 * Handle video interactions: view, like, comment
 * Body: { videoId, action: 'view'|'like'|'comment', userId?, userName?, text? }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    const body = await request.json();
    const { videoId, action, userId, userName, text } = body;

    if (!videoId || !action) {
      return NextResponse.json({ error: 'videoId and action required' }, { status: 400 });
    }

    const video = await CommunityVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    switch (action) {
      case 'view': {
        // Increment view count
        video.views = (video.views || 0) + 1;
        await video.save();
        return NextResponse.json({ success: true, views: video.views });
      }

      case 'like': {
        if (!userId) {
          return NextResponse.json({ error: 'userId required for like' }, { status: 400 });
        }
        // Toggle like
        if (!Array.isArray(video.likes)) video.likes = [];
        const likeIndex = video.likes.indexOf(userId);
        if (likeIndex === -1) {
          video.likes.push(userId);
        } else {
          video.likes.splice(likeIndex, 1);
        }
        await video.save();
        return NextResponse.json({ success: true, likes: video.likes });
      }

      case 'comment': {
        if (!userId || !text?.trim()) {
          return NextResponse.json({ error: 'userId and text required for comment' }, { status: 400 });
        }
        if (!Array.isArray(video.comments)) video.comments = [];
        video.comments.push({
          userId,
          userName: userName || '',
          text: text.trim(),
          createdAt: new Date(),
        });
        await video.save();
        return NextResponse.json({ success: true, comments: video.comments });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: view, like, comment' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Recording Interact] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
