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

    // Find all videos grouped by workshopName and batchName
    const videos = await CommunityVideo.find({
      workshopName: workshopName.trim(),
    })
      .select('workshopName batchName videoNumber createdAt')
      .sort({ batchName: 1, videoNumber: 1 })
      .lean();

    // Group by batchName and calculate stats
    const batchMap = new Map<string, any>();
    for (const video of videos) {
      const batch = video.batchName || 'Untitled Batch';
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
      const videoNum = parseInt(String(video.videoNumber), 10) || 0;
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
