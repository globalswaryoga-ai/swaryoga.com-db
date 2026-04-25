import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getWorkshop, getBatch, getWorkshopVideo } from '@/lib/schemas/workshopSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workshops
 * List workshops for public/logged-in users
 * - Returns all active workshops
 * - If logged in, includes enrollment status
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    let decoded: any = null;
    try {
      decoded = verifyToken(authHeader);
    } catch (e) {
      // Not logged in, that's fine for public access
    }

    await connectDB();
    const Workshop = getWorkshop();
    const Batch = getBatch();
    const WorkshopVideo = getWorkshopVideo();

    const { searchParams } = new URL(req.url);
    const workshopSlug = searchParams.get('slug');

    // Single workshop detail
    if (workshopSlug) {
      const workshop = await Workshop.findOne({ slug: workshopSlug, isActive: true }).lean();
      if (!workshop) {
        return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
      }

      // Get batches for this workshop
      const batches = await Batch.find({ 
        workshopId: workshop._id, 
        isActive: true 
      }).lean();

      // Check if user is enrolled
      let userEnrollment: any = null;
      let enrolledBatchId: any = null;
      if (decoded?.id) {
        const userId = new mongoose.Types.ObjectId(decoded.id);
        const enrolledBatch = await Batch.findOne({
          workshopId: workshop._id,
          enrolledUsers: userId,
          isActive: true,
        });
        if (enrolledBatch) {
          userEnrollment = {
            batchId: enrolledBatch._id,
            batchNumber: enrolledBatch.batchNumber,
            batchName: enrolledBatch.name,
          };
          enrolledBatchId = enrolledBatch._id;
        }
      }

      // Get videos based on access
      let videos: any[] = [];
      
      // Free videos are always visible
      const freeVideos = await WorkshopVideo.find({
        workshopId: workshop._id,
        accessType: 'free',
        isActive: true,
      }).sort({ dayNumber: 1 }).lean();
      videos.push(...freeVideos.map((v: any) => ({ ...v, canWatch: true })));

      // If enrolled, show batch videos
      if (enrolledBatchId) {
        const enrolledVideos = await WorkshopVideo.find({
          workshopId: workshop._id,
          batchId: enrolledBatchId,
          isActive: true,
        }).sort({ dayNumber: 1 }).lean();
        videos.push(...enrolledVideos.map((v: any) => ({ ...v, canWatch: true })));
      }

      // Show other videos as "locked" previews
      const lockedVideos = await WorkshopVideo.find({
        workshopId: workshop._id,
        accessType: { $ne: 'free' },
        ...(enrolledBatchId ? { batchId: { $ne: enrolledBatchId } } : {}),
        isActive: true,
      }).sort({ dayNumber: 1 }).lean();
      videos.push(...lockedVideos.map((v: any) => ({ 
        ...v, 
        canWatch: false,
        s3Key: undefined, // Don't expose S3 key for locked videos
      })));

      // Remove duplicates and sort
      const uniqueVideos = videos.reduce((acc: any[], video: any) => {
        if (!acc.find((v: any) => v._id.toString() === video._id.toString())) {
          acc.push(video);
        }
        return acc;
      }, []);
      uniqueVideos.sort((a: any, b: any) => a.dayNumber - b.dayNumber);

      return NextResponse.json({
        success: true,
        workshop: {
          ...workshop,
          batchCount: batches.length,
        },
        userEnrollment,
        videos: uniqueVideos,
        isLoggedIn: !!decoded,
      });
    }

    // List all workshops
    const workshops = await Workshop.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with stats and enrollment status
    const enrichedWorkshops = await Promise.all(
      workshops.map(async (workshop: any) => {
        const batchCount = await Batch.countDocuments({ 
          workshopId: workshop._id, 
          isActive: true 
        });
        const videoCount = await WorkshopVideo.countDocuments({ 
          workshopId: workshop._id,
          isActive: true 
        });
        const freeVideoCount = await WorkshopVideo.countDocuments({
          workshopId: workshop._id,
          accessType: 'free',
          isActive: true,
        });

        let isEnrolled = false;
        if (decoded?.id) {
          const userId = new mongoose.Types.ObjectId(decoded.id);
          const enrollment = await Batch.findOne({
            workshopId: workshop._id,
            enrolledUsers: userId,
          });
          isEnrolled = !!enrollment;
        }

        return {
          ...workshop,
          batchCount,
          videoCount,
          freeVideoCount,
          isEnrolled,
        };
      })
    );

    return NextResponse.json({
      success: true,
      workshops: enrichedWorkshops,
      isLoggedIn: !!decoded,
    });
  } catch (error: any) {
    console.error('[Public Workshops API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
