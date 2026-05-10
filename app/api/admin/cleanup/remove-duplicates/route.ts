import { NextRequest, NextResponse } from 'next/server';
import connectDB, { getCourseVideo, getRecordedCourse } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * POST - Remove duplicate videos from a course
 * Keeps the first one, deletes the rest by title
 */
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

    // Get all active videos
    const videos = await CourseVideo.find({ courseId, isActive: true }).sort({ createdAt: 1 });

    // Group by title (case-insensitive)
    const titleGroups: Record<string, any[]> = {};
    videos.forEach((v: any) => {
      const key = v.title?.toLowerCase() || 'untitled';
      if (!titleGroups[key]) titleGroups[key] = [];
      titleGroups[key].push(v);
    });

    // Find duplicates and delete extras
    let deletedCount = 0;
    const report: any[] = [];

    for (const [title, vids] of Object.entries(titleGroups)) {
      if (vids.length > 1) {
        console.log(`Found ${vids.length} copies of "${title}"`);

        // Keep the first one, delete the rest
        const toDelete = vids.slice(1);
        const deleteIds = toDelete.map((v: any) => v._id);

        const result = await CourseVideo.updateMany(
          { _id: { $in: deleteIds } },
          {
            isActive: false,
            deletedAt: new Date(),
            deletedBy: decoded.email || decoded.userId || 'admin',
          }
        );

        deletedCount += result.modifiedCount;
        report.push({
          title,
          totalCopies: vids.length,
          kept: 1,
          deleted: result.modifiedCount,
          deletedIds: deleteIds.map((id: any) => id.toString()),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Removed ${deletedCount} duplicate video(s).`,
      deletedCount,
      report,
    });
  } catch (error: any) {
    console.error('[Remove Duplicates Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
