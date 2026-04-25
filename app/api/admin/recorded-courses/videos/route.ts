/**
 * Admin API for Course Videos Management
 * GET /api/admin/recorded-courses/videos - List videos for a course
 * POST /api/admin/recorded-courses/videos - Create new video
 * PUT /api/admin/recorded-courses/videos - Update video
 * DELETE /api/admin/recorded-courses/videos - Delete video
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getRecordedCourse,
  getCourseVideo,
  getCourseSection,
} from '@/lib/schemas/recordedCourseSchemas';

export const dynamic = 'force-dynamic';


// Check superadmin access - E-Learning management is superadmin only
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
    const CourseSection = getCourseSection();
    
    const videos = await CourseVideo.find({ courseId }).sort({ order: 1 }).lean();
    const sections = await CourseSection.find({ courseId }).sort({ order: 1 }).lean();
    
    return NextResponse.json({
      success: true,
      videos,
      sections,
    });
    
  } catch (error: any) {
    console.error('[Admin Videos GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
    const { courseId, ...videoData } = body;
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }
    
    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();
    
    // Verify course exists
    const course = await RecordedCourse.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Get next order number
    const lastVideo = await CourseVideo.findOne({ courseId }).sort({ order: -1 });
    const nextOrder = (lastVideo?.order || 0) + 1;
    
    // Generate slug if not provided
    let slug = videoData.slug;
    if (!slug && videoData.content?.en?.title) {
      slug = videoData.content.en.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    const video = await CourseVideo.create({
      ...videoData,
      courseId,
      slug: slug || `video-${nextOrder}`,
      order: videoData.order || nextOrder,
      createdBy: decoded.id,
    });
    
    // Update course totals
    const videoCount = await CourseVideo.countDocuments({ courseId });
    const allVideos = await CourseVideo.find({ courseId });
    const totalDuration = allVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
    
    await RecordedCourse.findByIdAndUpdate(courseId, {
      totalVideos: videoCount,
      totalDuration,
    });
    
    return NextResponse.json({
      success: true,
      video,
    });
    
  } catch (error: any) {
    console.error('[Admin Videos POST Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
    const { videoId, courseId, ...updateData } = body;
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }
    
    const CourseVideo = getCourseVideo();
    const RecordedCourse = getRecordedCourse();
    
    const video = await CourseVideo.findByIdAndUpdate(
      videoId,
      { ...updateData, updatedBy: decoded.id },
      { new: true }
    );
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Update course totals
    if (video.courseId) {
      const allVideos = await CourseVideo.find({ courseId: video.courseId });
      const totalDuration = allVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
      await RecordedCourse.findByIdAndUpdate(video.courseId, {
        totalVideos: allVideos.length,
        totalDuration,
      });
    }
    
    return NextResponse.json({
      success: true,
      video,
    });
    
  } catch (error: any) {
    console.error('[Admin Videos PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete video (soft delete)
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
      { isActive: false, deletedAt: new Date(), deletedBy: decoded.id },
      { new: true }
    );
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    
    // Update course totals
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
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
