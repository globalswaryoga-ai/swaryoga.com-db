import { NextRequest, NextResponse } from 'next/server';
import connectDB, {
  getCourseVideo,
  getRecordedCourse,
} from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

/**
 * GET - List videos for a course
 */
export async function GET(request: NextRequest) {
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

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();
    const videos = await CourseVideo.find({ courseId }).sort({ order: 1 }).lean();

    // Deduplicate videos by _id to prevent duplicates
    const seenIds = new Set<string>();
    const uniqueVideos = videos.filter((v: any) => {
      const id = v._id?.toString() || v._id;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    return NextResponse.json({
      success: true,
      videos: uniqueVideos.map((v: any) => ({
        _id: v._id?.toString() || v._id,
        title: v.title,
        description: v.description,
        bunnyVideoId: v.bunnyVideoId,
        duration: v.duration,
        order: v.order,
        isFree: v.isFree,
        isActive: v.isActive,
        thumbnail: v.thumbnail,
      })),
    });
  } catch (error: any) {
    console.error('[Admin Videos GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Create new video
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

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, title, description, bunnyVideoId, duration = 0, isFree = false } = body;

    if (!courseId || !title || !bunnyVideoId) {
      return NextResponse.json({
        error: 'Missing required fields: courseId, title, bunnyVideoId'
      }, { status: 400 });
    }

    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();

    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check for duplicate video (same title + bunnyVideoId in same course)
    const existingVideo = await CourseVideo.findOne({
      courseId,
      title,
      bunnyVideoId,
    });

    if (existingVideo) {
      return NextResponse.json({
        error: 'Video with this title and video ID already exists in this course',
        existingId: existingVideo._id,
      }, { status: 409 });
    }

    const lastVideo = await CourseVideo.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastVideo?.order || 0) + 1;

    const videoDoc = await CourseVideo.create({
      courseId,
      title,
      description: description || '',
      bunnyVideoId,
      duration: parseInt(duration) || 0,
      isFree: isFree === true,
      isActive: true,
      order: nextOrder,
      createdBy: decoded.email || decoded.userId || 'admin',
      content: {
        en: {
          title: title,
          description: description || '',
        },
      },
    });

    await RecordedCourse.findByIdAndUpdate(courseId, {
      $inc: { totalVideos: 1 },
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: videoDoc._id,
        title: videoDoc.title,
        bunnyVideoId: videoDoc.bunnyVideoId,
        duration: videoDoc.duration,
        isFree: videoDoc.isFree,
      },
    });
  } catch (error: any) {
    console.error('[Admin Videos POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PUT - Update video
 */
export async function PUT(request: NextRequest) {
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

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { videoId, title, description, duration, isFree } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();

    const updateData: any = { updatedBy: decoded.email || decoded.userId };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = parseInt(duration) || 0;
    if (isFree !== undefined) updateData.isFree = isFree === true;

    const video = await CourseVideo.findByIdAndUpdate(videoId, updateData, { new: true });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        isFree: video.isFree,
      },
    });
  } catch (error: any) {
    console.error('[Admin Videos PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete video
 */
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

    if (!checkSuperAdminAccess(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const videoId = request.nextUrl.searchParams.get('id');
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();

    const video = await CourseVideo.findByIdAndUpdate(
      videoId,
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.email || decoded.userId },
      { new: true }
    );

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.courseId) {
      const videoCount = await CourseVideo.countDocuments({ courseId: video.courseId, isActive: true });
      await RecordedCourse.findByIdAndUpdate(video.courseId, { totalVideos: videoCount });
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted',
    });
  } catch (error: any) {
    console.error('[Admin Videos DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
