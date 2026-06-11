import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunityVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/community/pending-zoom-shares
 * List Zoom recordings with pending email invites.
 * Used by the pending-zoom-shares CRM page to show which videos need invites.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const CommunityVideo = getCommunityVideo();

    const videos = await CommunityVideo.find({
      source: 'zoom',
      pendingEmailInvites: { $exists: true, $ne: [] },
    })
      .select(
        '_id title youtubeVideoId communityId pendingEmailInvites createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error: any) {
    console.error('[Pending Zoom Shares]', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
