import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/admin/fix-aahar-batches
 * Fix script to consolidate "Swar Aahar Shastra" videos into a single batch
 * Protected: requires admin authentication
 *
 * Issue: 4 videos added to workshop but showing as separate batches
 * Root cause: Videos have different batch names in their titles
 * Solution: Standardize all videos to use "25th April Batch"
 */

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Import getCommunityVideo after DB connection
    const { getCommunityVideo } = await import('@/lib/db');
    const CommunityVideo = getCommunityVideo();

    // Find all videos for Aahar community with "Swar Aahar Shastra" in title
    const videos = await CommunityVideo.find({
      communityId: 'aahar',
      title: { $regex: 'Swar.*Aahar.*Shastra', $options: 'i' }
    }).lean();

    if (videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos found for Swar Aahar Shastra in aahar community',
        videosFound: 0
      });
    }

    // Group by current batch name to see the issue
    const batchGroups: Record<string, any[]> = {};
    videos.forEach(video => {
      const parts = video.title?.split(' > ') || [];
      const currentBatch = parts[1] || 'Default Batch';
      if (!batchGroups[currentBatch]) {
        batchGroups[currentBatch] = [];
      }
      batchGroups[currentBatch].push(video);
    });

    // Find updates needed
    const standardBatchName = '25th April Batch';
    const updates: any[] = [];

    for (const video of videos) {
      const parts = video.title.split(' > ');
      const folder = parts[0];
      const currentBatch = parts[1] || 'Default Batch';

      if (currentBatch !== standardBatchName) {
        let newTitle = `${folder} > ${standardBatchName}`;
        if (parts.length > 2) {
          newTitle += ' > ' + parts.slice(2).join(' > ');
        }

        updates.push({
          _id: video._id,
          oldTitle: video.title,
          newTitle: newTitle,
        });
      }
    }

    // If no updates needed
    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All videos already use the same batch name',
        videosFound: videos.length,
        updatesApplied: 0,
        currentBatches: batchGroups,
      });
    }

    // Apply updates
    let successCount = 0;
    const updateDetails: any[] = [];

    for (const upd of updates) {
      const result = await CommunityVideo.updateOne(
        { _id: upd._id },
        { title: upd.newTitle }
      );
      if (result.modifiedCount > 0) {
        successCount++;
        updateDetails.push({
          oldTitle: upd.oldTitle,
          newTitle: upd.newTitle,
          success: true,
        });
      }
    }

    // Verify the fix
    const verifyVideos = await CommunityVideo.find({
      communityId: 'aahar',
      title: { $regex: 'Swar.*Aahar.*Shastra', $options: 'i' }
    }).lean();

    const finalBatchGroups: Record<string, any[]> = {};
    verifyVideos.forEach(video => {
      const parts = video.title?.split(' > ') || [];
      const batch = parts[1] || 'Default Batch';
      if (!finalBatchGroups[batch]) {
        finalBatchGroups[batch] = [];
      }
      finalBatchGroups[batch].push(video);
    });

    return NextResponse.json({
      success: true,
      message: 'Batch consolidation completed successfully',
      videosFound: videos.length,
      updatesApplied: successCount,
      beforeBatches: batchGroups,
      afterBatches: finalBatchGroups,
      updateDetails: updateDetails,
      fixed: Object.keys(finalBatchGroups).length === 1,
    });
  } catch (error: any) {
    console.error('[Fix Aahar Batches] Error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
