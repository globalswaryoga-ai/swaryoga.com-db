import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunityVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';


/**
 * DELETE /api/admin/communities/video-interactions
 * Delete a comment from a video (admin only)
 * Body: { videoId, commentIndex }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const CommunityVideo = getCommunityVideo();

    const { videoId, commentIndex } = await request.json();
    if (!videoId || commentIndex === undefined) {
      return NextResponse.json({ error: 'videoId and commentIndex required' }, { status: 400 });
    }

    const video = await CommunityVideo.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!Array.isArray(video.comments) || commentIndex >= video.comments.length) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    video.comments.splice(commentIndex, 1);
    await video.save();

    return NextResponse.json({ success: true, message: 'Comment deleted', remainingComments: video.comments.length });
  } catch (error: any) {
    console.error('[Video Interactions] DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
