/**
 * Course Video Streaming API (BunnyDB)
 * GET /api/recorded-courses/video/[videoId] - Get video streaming URL
 * POST /api/recorded-courses/video/[videoId] - Update watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import {
  getVideoById,
  getCourseById,
  getEnrollment,
  registerDevice,
  logWatchProgress,
  saveEnrollment,
} from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let videoId = '';
  try {
    const resolved = await params;
    videoId = resolved.videoId;

    let decoded: any = null;
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?._id || decoded?.userId || null;
      } catch {
        // Continue as guest
      }
    }

    const video = await getVideoById(videoId);
    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const course = await getCourseById(video.courseId);
    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const isFreeAccess = video.isFree === true;

    if (!isFreeAccess && userId) {
      const enrollment = await getEnrollment(String(userId), course.id);
      if (!enrollment) {
        return NextResponse.json(
          { error: 'Not enrolled in this course', requiresEnrollment: true },
          { status: 403 }
        );
      }
      const disabledVideoIds = Array.isArray(enrollment.data?.disabledVideoIds)
        ? enrollment.data.disabledVideoIds
        : Array.isArray((enrollment as any).disabledVideoIds)
        ? (enrollment as any).disabledVideoIds
        : [];
      if (disabledVideoIds.includes(video.id)) {
        return NextResponse.json(
          { error: 'This video has been locked by the instructor for your account.', isLocked: true, disabledByAdmin: true },
          { status: 403 }
        );
      }
    } else if (!isFreeAccess && !userId) {
      return NextResponse.json(
        { error: 'Enrollment required', requiresEnrollment: true },
        { status: 403 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const deviceFingerprint = getDeviceFingerprint(request);
    const deviceName = getDeviceName(request, userAgent);

    if (userId) {
      try {
        await registerDevice({
          userId: String(userId),
          courseId: course.id,
          deviceFingerprint,
          deviceName,
          ip: ipAddress,
        });
      } catch (e) {
        console.warn('[Video API] Device registration error:', e);
      }
    }

    let streamingData: any = {};
    if (video.videoUrl) {
      streamingData = { directUrl: video.videoUrl };
    } else if (video.bunnyVideoId) {
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || '';
      let playerUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyVideoId}?preload=true&responsive=true`;
      const streamCdnKey = process.env.BUNNY_STREAM_CDN_KEY;
      if (streamCdnKey) {
        const expiry = Math.floor(Date.now() / 1000) + 3600;
        const token = crypto
          .createHash('sha256')
          .update(streamCdnKey + video.bunnyVideoId + expiry)
          .digest('hex');
        playerUrl += `&token=${token}&expires=${expiry}`;
      }
      streamingData = {
        playerUrl,
        bunnyVideoId: video.bunnyVideoId,
        bunnyLibraryId: libraryId,
      };
    }

    return NextResponse.json({
      success: true,
      video: {
        _id: video.id,
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration,
        order: video.order,
        sectionId: video.sectionId,
        ragEnabled: false,
        hasRagContent: false,
      },
      streaming: streamingData,
      watchLogId: userId ? `${userId}_${video.id}` : null,
      courseSettings: {
        allowDownload: course.accessSettings?.allowDownload || false,
        allowScreenRecording: course.accessSettings?.allowScreenRecording || false,
      },
    });
  } catch (error: any) {
    console.error('[Video Streaming Error]:', error);
    return NextResponse.json(
      { error: 'Server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId;

    const body = await request.json();
    const { watchedSeconds = 0, completed = false } = body;

    const video = await getVideoById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    await logWatchProgress(String(userId), video.id, video.courseId, watchedSeconds, completed);

    const enrollment = await getEnrollment(String(userId), video.courseId);
    let updatedProgress = 0;
    let watchedCount = 0;

    if (enrollment) {
      const watched = new Set(enrollment.videosWatched || []);
      if (completed) {
        watched.add(video.id);
      }
      watchedCount = watched.size;
      const course = await getCourseById(video.courseId);
      const totalVideos = course?.totalDuration ? 10 : 1;
      updatedProgress = Math.min(100, Math.round((watchedCount / totalVideos) * 100));

      await saveEnrollment({
        id: enrollment.id,
        userId: String(userId),
        courseId: video.courseId,
        progressPercent: updatedProgress,
        videosWatched: Array.from(watched),
      });
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      videosWatched: watchedCount,
    });
  } catch (error: any) {
    console.error('[Video Progress Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function parseDeviceName(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}

function getDeviceFingerprint(request: NextRequest): string {
  const explicit = request.nextUrl.searchParams.get('fingerprint') || request.headers.get('x-device-fingerprint');
  if (explicit) return explicit.slice(0, 256);

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const language = request.headers.get('accept-language') || '';
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '';
  return crypto
    .createHash('sha256')
    .update([userAgent, language, ipAddress].join('|'))
    .digest('hex');
}

function getDeviceName(request: NextRequest, userAgent: string): string {
  return (
    request.nextUrl.searchParams.get('deviceName') ||
    request.headers.get('x-device-name') ||
    parseDeviceName(userAgent)
  ).slice(0, 120);
}
