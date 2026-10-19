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
        // Continue as guest or student email
      }
    }

    if (!userId) {
      const emailParam =
        request.headers.get('x-student-email') ||
        request.nextUrl.searchParams.get('email') ||
        request.nextUrl.searchParams.get('userId');
      if (emailParam && emailParam.includes('@')) {
        userId = emailParam.trim().toLowerCase();
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
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
    const deviceFingerprint = getDeviceFingerprint(request);
    const parsedDevice = parseDeviceDetails(userAgent);
    const deviceName = getDeviceName(request, userAgent) || parsedDevice.deviceName;

    if (userId) {
      try {
        await registerDevice({
          userId: String(userId),
          courseId: course.id,
          deviceFingerprint,
          deviceName,
          deviceType: parsedDevice.deviceType,
          browser: parsedDevice.browser,
          os: parsedDevice.os,
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

    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded) {
          userId = (decoded as any).id || (decoded as any)._id || (decoded as any).userId || null;
        }
      } catch {}
    }

    const body = await request.json().catch(() => ({}));
    const {
      watchedSeconds = 0,
      totalSeconds = 0,
      completed = false,
      email: bodyEmail,
      userId: bodyUserId,
    } = body;

    if (!userId) {
      const fallbackEmail =
        bodyEmail ||
        bodyUserId ||
        request.headers.get('x-student-email') ||
        request.nextUrl.searchParams.get('email');
      if (fallbackEmail && typeof fallbackEmail === 'string' && fallbackEmail.includes('@')) {
        userId = fallbackEmail.trim().toLowerCase();
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized or missing student identification' }, { status: 401 });
    }

    const video = await getVideoById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
    const deviceFingerprint = getDeviceFingerprint(request);
    const parsedDevice = parseDeviceDetails(userAgent);
    const deviceName = getDeviceName(request, userAgent) || parsedDevice.deviceName;

    // Register / update student device
    try {
      await registerDevice({
        userId: String(userId),
        courseId: video.courseId,
        deviceFingerprint,
        deviceName,
        deviceType: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        ip: ipAddress,
      });
    } catch (e) {
      console.warn('[Video API] Device registration error in POST:', e);
    }

    // Log watch progress
    const effectiveWatchSeconds = Math.max(0, Math.round(Number(watchedSeconds) || 0));
    const effectiveDuration = Math.max(1, Number(video.duration) || Number(totalSeconds) || 1);
    const isActuallyCompleted = completed || (effectiveWatchSeconds >= effectiveDuration * 0.9);

    await logWatchProgress(String(userId), video.id, video.courseId, effectiveWatchSeconds, isActuallyCompleted);

    // Update enrollment progress
    const enrollment = await getEnrollment(String(userId), video.courseId);
    let updatedProgress = 0;
    let watchedCount = 0;

    if (enrollment) {
      const watched = new Set(enrollment.videosWatched || []);
      if (isActuallyCompleted) {
        watched.add(video.id);
      }
      watchedCount = watched.size;

      const dataJson = enrollment.data || {};
      const videoProgress = (dataJson.videoProgress && typeof dataJson.videoProgress === 'object')
        ? { ...dataJson.videoProgress }
        : {};

      videoProgress[video.id] = {
        watchedSeconds: effectiveWatchSeconds,
        duration: effectiveDuration,
        percent: Math.min(100, Math.round((effectiveWatchSeconds / effectiveDuration) * 100)),
        isCompleted: isActuallyCompleted,
        lastWatchedAt: new Date().toISOString(),
      };

      // Recalculate course overall progress percent
      const course = await getCourseById(video.courseId);
      const totalVideos = 6; // default 6 videos for Swar Yoga workshop
      updatedProgress = Math.min(100, Math.round((watchedCount / totalVideos) * 100));

      const updatedData = {
        ...dataJson,
        videoProgress,
        ipAddress,
        userAgent,
        lastActiveAt: new Date().toISOString(),
        completedVideoIds: Array.from(watched),
      };

      await saveEnrollment({
        id: enrollment.id,
        userId: String(userId),
        courseId: video.courseId,
        progressPercent: updatedProgress,
        videosWatched: Array.from(watched),
        data: updatedData,
      });
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      videosWatched: watchedCount,
      watchedSeconds: effectiveWatchSeconds,
      completed: isActuallyCompleted,
    });
  } catch (error: any) {
    console.error('[Video Progress Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function parseDeviceDetails(userAgent: string) {
  let deviceName = 'Web Browser';
  let deviceType = 'desktop';
  let browser = 'Web Browser';
  let os = 'Unknown OS';

  if (!userAgent) return { deviceName, deviceType, browser, os };

  if (/iPhone/i.test(userAgent)) {
    deviceName = 'Apple iPhone';
    deviceType = 'mobile';
    os = 'iOS';
  } else if (/iPad/i.test(userAgent)) {
    deviceName = 'Apple iPad';
    deviceType = 'tablet';
    os = 'iPadOS';
  } else if (/Android.*Mobile|Mobile/i.test(userAgent)) {
    deviceName = 'Android Mobile';
    deviceType = 'mobile';
    os = 'Android';
  } else if (/Android/i.test(userAgent)) {
    deviceName = 'Android Tablet';
    deviceType = 'tablet';
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    deviceName = 'MacBook / Mac OS';
    deviceType = 'desktop';
    os = 'macOS';
  } else if (/Windows NT 10.0/i.test(userAgent)) {
    deviceName = 'Windows 10/11 PC';
    deviceType = 'desktop';
    os = 'Windows 10/11';
  } else if (/Windows/i.test(userAgent)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
    os = 'Windows';
  } else if (/Linux/i.test(userAgent)) {
    deviceName = 'Linux PC';
    deviceType = 'desktop';
    os = 'Linux';
  }

  if (/Edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/Safari\//i.test(userAgent)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(userAgent)) browser = 'Mozilla Firefox';

  return { deviceName, deviceType, browser, os };
}

function parseDeviceName(userAgent: string): string {
  return parseDeviceDetails(userAgent).deviceName;
}

function getDeviceFingerprint(request: NextRequest): string {
  const explicit = request.nextUrl.searchParams.get('fingerprint') || request.headers.get('x-device-fingerprint');
  if (explicit) return explicit.slice(0, 256);

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const language = request.headers.get('accept-language') || '';
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '';
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
