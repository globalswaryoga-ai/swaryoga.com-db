import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema, getCommunityVideo } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/community/recordings/interact
 * Handle video interactions: view, like, comment
 */
export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const body = await request.json();
    const { videoId, action, userId, userName, text } = body;

    if (!videoId || !action) {
      return NextResponse.json({ error: 'videoId and action required' }, { status: 400 });
    }

    const video = await getCommunityVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const raw = video.rawDoc || {};

    switch (action) {
      case 'view': {
        const views = (Number(raw.views) || 0) + 1;
        raw.views = views;
        await bunnyExecute({
          sql: 'UPDATE community_videos_sql SET raw_doc_json = ? WHERE id = ?',
          args: [JSON.stringify(raw), videoId],
        });
        return NextResponse.json({ success: true, views });
      }

      case 'like': {
        if (!userId) {
          return NextResponse.json({ error: 'userId required for like' }, { status: 400 });
        }
        const likes: string[] = Array.isArray(raw.likes) ? raw.likes : [];
        const idx = likes.indexOf(userId);
        if (idx === -1) {
          likes.push(userId);
        } else {
          likes.splice(idx, 1);
        }
        raw.likes = likes;
        await bunnyExecute({
          sql: 'UPDATE community_videos_sql SET raw_doc_json = ? WHERE id = ?',
          args: [JSON.stringify(raw), videoId],
        });
        return NextResponse.json({ success: true, likes });
      }

      case 'comment': {
        if (!userId || !text?.trim()) {
          return NextResponse.json({ error: 'userId and text required for comment' }, { status: 400 });
        }
        const comments: any[] = Array.isArray(raw.comments) ? raw.comments : [];
        comments.push({
          userId,
          userName: userName || '',
          text: text.trim(),
          createdAt: new Date().toISOString(),
        });
        raw.comments = comments;
        await bunnyExecute({
          sql: 'UPDATE community_videos_sql SET raw_doc_json = ? WHERE id = ?',
          args: [JSON.stringify(raw), videoId],
        });
        return NextResponse.json({ success: true, comments });
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
