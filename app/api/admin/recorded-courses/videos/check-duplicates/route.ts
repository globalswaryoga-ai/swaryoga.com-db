import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getCourseVideo } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();

    // Find all active videos for this course
    const videos = await CourseVideo.find({ courseId, isActive: true }).lean();

    // Group by title to find duplicates
    const titleGroups: Record<string, any[]> = {};
    videos.forEach((v: any) => {
      const key = v.title?.toLowerCase() || 'untitled';
      if (!titleGroups[key]) titleGroups[key] = [];
      titleGroups[key].push(v);
    });

    // Find duplicates
    const duplicates = Object.entries(titleGroups)
      .filter(([_, videos]) => videos.length > 1)
      .map(([title, videos]) => ({
        title,
        count: videos.length,
        videos: videos.map((v: any) => ({
          _id: v._id?.toString() || v._id,
          title: v.title,
          bunnyVideoId: v.bunnyVideoId,
          duration: v.duration,
          order: v.order,
          isFree: v.isFree,
          createdAt: v.createdAt,
        })),
        suggestion: `Keep the latest one (${new Date(videos[videos.length - 1].createdAt || 0).toLocaleDateString()}), delete ${videos.length - 1} duplicate(s)`,
      }));

    return NextResponse.json({
      success: true,
      totalVideos: videos.length,
      duplicateGroups: duplicates.length,
      duplicates,
    });
  } catch (error: any) {
    console.error('[Check Duplicates Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { videoIds } = body; // Array of video IDs to delete

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({ error: 'Video IDs array required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();

    // Soft delete by marking as inactive
    const result = await CourseVideo.updateMany(
      { _id: { $in: videoIds } },
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: decoded.email || decoded.userId || 'admin',
      }
    );

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.modifiedCount} duplicate video(s)`,
      deletedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[Delete Duplicates Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
