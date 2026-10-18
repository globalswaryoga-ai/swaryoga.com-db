import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { findBunnyVideoByTitle } from '@/lib/bunny-stream';
import {
  listVideosByCourse,
  getVideoById,
  saveVideo,
  deleteVideo,
  getCourseById,
} from '@/lib/bunnyCourseRepository';

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

    const videos = await listVideosByCourse(courseId, true);

    return NextResponse.json({
      success: true,
      videos: videos.map((v) => ({
        _id: v.id,
        id: v.id,
        title: v.title,
        description: v.description,
        bunnyVideoId: v.bunnyVideoId,
        duration: v.duration,
        hoursGap: 0,
        order: v.order,
        isFree: v.isFree,
        isActive: v.isActive,
        thumbnail: (() => {
          const rawThumb = (v.content as any)?.thumbnail || (v.content as any)?.en?.thumbnail || '';
          if (rawThumb) {
            return (rawThumb.includes('vz-') || rawThumb.includes('video.bunnycdn'))
              ? `/api/recorded-courses/thumbnail?url=${encodeURIComponent(rawThumb)}`
              : rawThumb;
          }
          return v.bunnyVideoId ? `/api/recorded-courses/thumbnail?vid=${v.bunnyVideoId}` : '';
        })(),
        transcript: '',
        aiSummary: '',
        ragEnabled: false,
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
      return NextResponse.json(
        { error: 'Missing required fields: courseId, title, bunnyVideoId' },
        { status: 400 }
      );
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const existingVideos = await listVideosByCourse(courseId, true);

    const existingByTitle = existingVideos.find(
      (v) => v.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (existingByTitle) {
      return NextResponse.json(
        {
          error: 'A video with this title already exists in this course. Use a different title or delete the existing one.',
          existingId: existingByTitle.id,
          existingTitle: existingByTitle.title,
        },
        { status: 409 }
      );
    }

    const existingByBunnyId = existingVideos.find((v) => v.bunnyVideoId === bunnyVideoId);
    if (existingByBunnyId) {
      return NextResponse.json(
        { error: 'This video already exists in this course', existingId: existingByBunnyId.id },
        { status: 409 }
      );
    }

    const nextOrder = existingVideos.length + 1;

    const video = await saveVideo({
      courseId,
      title,
      description: description || '',
      bunnyVideoId,
      duration: parseInt(duration) || 0,
      isFree: isFree === true,
      isActive: true,
      order: nextOrder,
      content: { en: { title, description: description || '' } },
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: video.id,
        id: video.id,
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
    const { videoId, title, description, duration, isFree, order } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    const existing = await getVideoById(videoId);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const updated = await saveVideo({
      id: videoId,
      courseId: existing.courseId,
      sectionId: existing.sectionId,
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      bunnyVideoId: existing.bunnyVideoId,
      videoUrl: existing.videoUrl,
      duration: duration !== undefined ? parseInt(duration) || 0 : existing.duration,
      isFree: isFree !== undefined ? isFree === true : existing.isFree,
      accessType: existing.accessType,
      order: order !== undefined ? Number(order) : existing.order,
      isActive: existing.isActive,
      content: {
        ...existing.content,
        en: {
          title: title || existing.title,
          description: description !== undefined ? description : existing.description,
        },
      },
    });

    return NextResponse.json({
      success: true,
      video: {
        _id: updated.id,
        id: updated.id,
        title: updated.title,
        description: updated.description,
        duration: updated.duration,
        isFree: updated.isFree,
      },
    });
  } catch (error: any) {
    console.error('[Admin Videos PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH - Update video order only
 */
export async function PATCH(request: NextRequest) {
  try {
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
    const { videoId, order } = body;

    if (!videoId || order === undefined) {
      return NextResponse.json({ error: 'Video ID and order required' }, { status: 400 });
    }

    const existing = await getVideoById(videoId);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const updated = await saveVideo({
      ...existing,
      order: Number(order),
    });

    return NextResponse.json({
      success: true,
      videoId: updated.id,
      order: updated.order,
    });
  } catch (error: any) {
    console.error('[Admin Videos PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete video
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const deleted = await deleteVideo(videoId);
    if (!deleted) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
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
