/**
 * Admin API for Course Videos Management
 * Simple working implementation based on community recording pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getRecordedCourse,
  getCourseVideo,
} from '@/lib/schemas/recordedCourseSchemas';

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

    return NextResponse.json({
      success: true,
      videos: videos.map(v => ({
        _id: v._id.toString(),
        title: v.title,
        description: v.description,
        bunnyVideoId: v.bunnyVideoId,
        duration: v.duration,
        order: v.order,
        isFree: v.isFree,
        isActive: v.isActive,
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

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    if (!title || !bunnyVideoId) {
      return NextResponse.json({ error: 'Title and Bunny Video ID required' }, { status: 400 });
    }

    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();

    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const lastVideo = await CourseVideo.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastVideo?.order || 0) + 1;

    const video = await CourseVideo.create({
      courseId,
      title,
      description: description || '',
      bunnyVideoId,
      duration: parseInt(duration) || 0,
      isFree: isFree === true,
      isActive: true,
      order: nextOrder,
      createdBy: decoded.email || decoded.userId || 'admin',
    });

    const videoCount = await CourseVideo.countDocuments({ courseId, isActive: true });
    const allVideos = await CourseVideo.find({ courseId, isActive: true });
    const totalDuration = allVideos.reduce((sum, v) => sum + (v.duration || 0), 0);

    await RecordedCourse.findByIdAndUpdate(courseId, {
      totalVideos: videoCount,
      totalDuration,
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: video._id,
        title: video.title,
        bunnyVideoId: video.bunnyVideoId,
        duration: video.duration,
        isFree: video.isFree,
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
      const allVideos = await CourseVideo.find({ courseId: video.courseId, isActive: true });
      const totalDuration = allVideos.reduce((sum, v) => sum + (v.duration || 0), 0);

      await RecordedCourse.findByIdAndUpdate(video.courseId, {
        totalVideos: videoCount,
        totalDuration,
      });
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
