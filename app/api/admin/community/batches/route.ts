import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getCommunityVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/community/batches?workshopName=X
 * Fetch all batches for a workshop with video counts and next sequence number
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const workshopName = request.nextUrl.searchParams.get('workshopName');
    if (!workshopName) {
      return NextResponse.json(
        { error: 'workshopName parameter required' },
        { status: 400 }
      );
    }

    await connectDB();
    const CommunityVideo = getCommunityVideo();

    // Find all videos with matching folder tag (stored as 'folder:workshopName')
    const folderTag = `folder:${workshopName.trim()}`;
    const videos = await CommunityVideo.find({
      tags: folderTag,
    })
      .select('tags createdAt')
      .sort({ createdAt: 1 })
      .lean();

    // Extract batch names from tags (stored as 'playlist:batchName')
    const batchMap = new Map<string, any>();
    for (const video of videos) {
      // Find the playlist tag
      const playlistTag = video.tags?.find((t: string) => t.startsWith('playlist:'));
      if (!playlistTag) continue;

      const batch = playlistTag.substring('playlist:'.length); // Remove 'playlist:' prefix

      if (!batchMap.has(batch)) {
        batchMap.set(batch, {
          batchName: batch,
          videoCount: 0,
          videoNumbers: [],
          lastUpdated: video.createdAt,
        });
      }

      const batchData = batchMap.get(batch)!;
      batchData.videoCount++;

      // Extract video number from tags (stored as 'video:N')
      const videoTag = video.tags?.find((t: string) => t.startsWith('video:'));
      const videoNum = videoTag ? parseInt(videoTag.substring('video:'.length), 10) : 0;
      batchData.videoNumbers.push(videoNum);

      if (new Date(video.createdAt) > new Date(batchData.lastUpdated)) {
        batchData.lastUpdated = video.createdAt;
      }
    }

    // Calculate next sequence number for each batch
    const batches = Array.from(batchMap.values()).map((batch) => ({
      batchName: batch.batchName,
      videoCount: batch.videoCount,
      nextVideoNumber: Math.max(...batch.videoNumbers, 0) + 1,
      lastUpdated: batch.lastUpdated,
    }));

    return NextResponse.json({
      success: true,
      workshopName,
      batches,
      totalBatches: batches.length,
    });
  } catch (error: any) {
    console.error('[Batches GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
