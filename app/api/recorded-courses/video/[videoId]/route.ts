/**
<<<<<<< HEAD
 * Course Video Streaming API (BunnyDB)
=======
 * Course Video Streaming API (Bunny Database / LibSQL)
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
 * GET /api/recorded-courses/video/[videoId] - Get video streaming URL
 * POST /api/recorded-courses/video/[videoId] - Update watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
<<<<<<< HEAD
import {
  getVideoById,
  getCourseById,
  getEnrollment,
  registerDevice,
  logWatchProgress,
  saveEnrollment,
} from '@/lib/bunnyCourseRepository';
=======
import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ videoId: string }>;
}

<<<<<<< HEAD
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

    // 60-second in-memory cache for video & course metadata
    const now = Date.now();
    const cacheKey = `vid_meta_${videoId}`;
    const cached = (globalThis as any).__videoMetaCache?.get(cacheKey);

    let video: any;
    let course: any;

    if (cached && cached.expiresAt > now) {
      video = cached.video;
      course = cached.course;
    } else {
      video = await getVideoById(videoId);
      if (!video || !video.isActive) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      course = await getCourseById(video.courseId);
      if (!course || !course.isActive) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      if (!(globalThis as any).__videoMetaCache) {
        (globalThis as any).__videoMetaCache = new Map();
      }
      (globalThis as any).__videoMetaCache.set(cacheKey, {
        video,
        course,
        expiresAt: now + 60000,
      });
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
      // Non-blocking device registration so video response starts immediately
      registerDevice({
        userId: String(userId),
        courseId: course.id,
        deviceFingerprint,
        deviceName,
        deviceType: parsedDevice.deviceType,
        browser: parsedDevice.browser,
        os: parsedDevice.os,
        ip: ipAddress,
      }).catch((e) => console.warn('[Video API] Device registration error:', e));
    }

    let streamingData: any = {};
    if (video.videoUrl && typeof video.videoUrl === 'string' && video.videoUrl.trim()) {
      const trimmedUrl = video.videoUrl.trim();
      if (trimmedUrl.includes('.m3u8') || trimmedUrl.includes('/playlist.')) {
        streamingData = {
          hlsUrl: trimmedUrl,
          directUrl: trimmedUrl,
        };
      } else if (trimmedUrl.includes('mediadelivery.net') || trimmedUrl.includes('/embed/')) {
        streamingData = {
          playerUrl: trimmedUrl,
        };
      } else {
        streamingData = {
          directUrl: trimmedUrl,
        };
      }
    } else if (video.bunnyVideoId) {
      const streamHost = process.env.BUNNY_STREAM_HOST || 'vz-d0769ece-079.b-cdn.net';
      const streamCdnKey = process.env.BUNNY_STREAM_CDN_KEY || '588efc37-ac6a-4044-aeb9-a27bcd1bb3a8';
      const expiry = Math.floor(Date.now() / 1000) + 86400; // 24 hours valid

      // 1. Generate signed HLS pull URL: SHA256(cdnKey + path + expiry) in URL-safe base64
      const hlsPath = `/${video.bunnyVideoId}/playlist.m3u8`;
      const hlsHash = crypto.createHash('sha256').update(streamCdnKey + hlsPath + expiry).digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const signedHlsUrl = `https://${streamHost}${hlsPath}?token=${hlsHash}&expires=${expiry}`;

      // 2. Generate signed Embed Player URL for iframe fallback
      const libraryId =
        (video.content as any)?.bunnyLibraryId ||
        (video.content as any)?.en?.bunnyLibraryId ||
        process.env.BUNNY_STREAM_LIBRARY_ID ||
        process.env.BUNNY_LIBRARY_ID ||
        '606386';
      let playerUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyVideoId}?preload=true&responsive=true`;
      if (streamCdnKey) {
        const embedToken = crypto
          .createHash('sha256')
          .update(streamCdnKey + video.bunnyVideoId + expiry)
          .digest('hex');
        playerUrl += `&token=${embedToken}&expires=${expiry}`;
      }
      streamingData = {
        hlsUrl: signedHlsUrl,
        directUrl: signedHlsUrl,
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

    const video = await getVideoById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!userId) {
      if (video.isFree) {
        const fp = body.deviceFingerprint || getDeviceFingerprint(request);
        userId = fp ? `guest_${fp}` : 'guest_anonymous';
      } else {
        return NextResponse.json({ error: 'Unauthorized or missing student identification' }, { status: 401 });
      }
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
    const effectiveDuration = Math.max(
      Number(totalSeconds) || 0,
      Number(video.duration) || 0,
      1
    );
    const isActuallyCompleted = effectiveDuration > 60
      ? (effectiveWatchSeconds >= effectiveDuration * 0.95 || (completed && effectiveWatchSeconds >= effectiveDuration * 0.9))
      : (completed || effectiveWatchSeconds >= effectiveDuration * 0.9);

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

=======
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
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
<<<<<<< HEAD
=======

function getDeviceInfo(request: NextRequest, userAgent: string): string {
  return (
    request.nextUrl.searchParams.get('deviceInfo') ||
    request.headers.get('x-device-info') ||
    userAgent
  ).slice(0, 1000);
}

/**
 * GET - Get video streaming data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Auth optional (required for paid videos, optional for free)
    let decoded: any = null;
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?._id || decoded?.userId || null;
      } catch {}
    }

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // 1. Fetch video from Bunny DB
    const videoRes = await bunnyExecute({
      sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
      args: [videoId],
    });

    if (!videoRes.rows.length) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = videoRes.rows[0];
    if (video.is_active === 0) {
      return NextResponse.json({ error: 'Video is inactive' }, { status: 404 });
    }

    // 2. Fetch course from Bunny DB
    const courseRes = await bunnyExecute({
      sql: 'SELECT * FROM recorded_courses_sql WHERE id = ? LIMIT 1',
      args: [video.course_id],
    });

    if (!courseRes.rows.length) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRes.rows[0];

    // Check if free access
    const isFreeAccess = Boolean(video.is_free) || Boolean(course.is_free);

    let enrollment: any = null;
    if (!isFreeAccess) {
      if (!userId) {
        return NextResponse.json({ error: 'Enrollment required', requiresEnrollment: true }, { status: 403 });
      }

      const enrollRes = await bunnyExecute({
        sql: `SELECT * FROM course_enrollments_sql 
              WHERE (user_id = ? OR email = ?) AND course_id = ? AND status IN ('active', 'completed') LIMIT 1`,
        args: [userId, decoded?.email || '', video.course_id],
      });

      if (!enrollRes.rows.length) {
        return NextResponse.json({ error: 'Not enrolled in this course', requiresEnrollment: true }, { status: 403 });
      }
      enrollment = enrollRes.rows[0];
    }

    // Device registration
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const deviceFingerprint = getDeviceFingerprint(request);
    const deviceName = getDeviceName(request, userAgent);
    const deviceInfo = getDeviceInfo(request, userAgent);

    if (userId) {
      try {
        const devId = `dev_${crypto.randomBytes(8).toString('hex')}`;
        const now = new Date().toISOString();
        await bunnyExecute({
          sql: `INSERT INTO course_devices_sql (id, user_id, course_id, device_fingerprint, device_name, ip, is_active, last_active_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                ON CONFLICT(user_id, course_id, device_fingerprint) DO UPDATE SET
                  device_name = excluded.device_name,
                  ip = excluded.ip,
                  last_active_at = excluded.last_active_at,
                  updated_at = excluded.updated_at`,
          args: [devId, userId, video.course_id, deviceFingerprint, deviceName, ipAddress, now, now, now],
        });
      } catch (deviceErr) {
        console.warn('[Video API] Device registration note:', deviceErr);
      }
    }

    // Build streaming data
    let streamingData: any = {};
    const directVideoUrl = String(video.video_url || '').trim();
    const bunnyVideoId = String(video.bunny_video_id || '').trim();

    if (directVideoUrl && directVideoUrl.startsWith('http')) {
      streamingData = { directUrl: directVideoUrl };
    } else if (bunnyVideoId) {
      const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID || '638748';
      let playerUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${bunnyVideoId}?preload=true&responsive=true`;
      const streamCdnKey = process.env.BUNNY_STREAM_CDN_KEY;

      if (streamCdnKey) {
        const expiry = Math.floor(Date.now() / 1000) + 3600;
        const token = crypto
          .createHash('sha256')
          .update(streamCdnKey + bunnyVideoId + expiry)
          .digest('hex');
        playerUrl += `&token=${token}&expires=${expiry}`;
      }

      streamingData = {
        playerUrl,
        bunnyVideoId,
        bunnyLibraryId: libraryId,
      };
    }

    let contentObj: any = {};
    try {
      contentObj = video.content_json ? JSON.parse(String(video.content_json)) : {};
    } catch {}

    let courseSettings: any = {};
    try {
      courseSettings = course.access_settings_json ? JSON.parse(String(course.access_settings_json)) : {};
    } catch {}

    const transcript = String(video.transcript || contentObj.transcript || '').trim();
    const aiSummary = String(video.ai_summary || contentObj.aiSummary || '').trim();

    return NextResponse.json({
      success: true,
      video: {
        _id: video.id,
        id: video.id,
        title: video.title || contentObj?.en?.title || '',
        description: video.description || contentObj?.en?.description || '',
        duration: Number(video.duration) || 0,
        order: Number(video.display_order) || 0,
        sectionId: video.section_id,
        ragEnabled: Boolean(video.rag_enabled),
        hasRagContent: Boolean(transcript || aiSummary),
        transcript: isFreeAccess || enrollment ? transcript : undefined,
        aiSummary: isFreeAccess || enrollment ? aiSummary : undefined,
      },
      streaming: streamingData,
      courseSettings: {
        allowDownload: Boolean(courseSettings.allowDownload),
        allowScreenRecording: Boolean(courseSettings.allowScreenRecording),
      },
    });
  } catch (error: any) {
    console.error('[Video Streaming Error]:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST - Update video watch progress
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { videoId } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const completed = Boolean(body.completed);

    // Get video
    const videoRes = await bunnyExecute({
      sql: 'SELECT * FROM course_videos_sql WHERE id = ? LIMIT 1',
      args: [videoId],
    });

    if (!videoRes.rows.length) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = videoRes.rows[0];

    // Get enrollment
    const enrollRes = await bunnyExecute({
      sql: `SELECT * FROM course_enrollments_sql 
            WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') LIMIT 1`,
      args: [userId, video.course_id],
    });

    if (!enrollRes.rows.length) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
    }

    const enrollment = enrollRes.rows[0];
    let watchedList: string[] = [];
    try {
      watchedList = enrollment.videos_watched_json ? JSON.parse(String(enrollment.videos_watched_json)) : [];
    } catch {}

    if (completed && !watchedList.includes(String(video.id))) {
      watchedList.push(String(video.id));
    }

    // Calculate total videos count
    const totalCountRes = await bunnyExecute({
      sql: 'SELECT COUNT(*) as cnt FROM course_videos_sql WHERE course_id = ? AND is_active = 1',
      args: [video.course_id],
    });
    const totalVideos = Number(totalCountRes.rows[0]?.cnt) || 1;
    const progressPercent = Math.min(100, Math.round((watchedList.length / totalVideos) * 100));
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: `UPDATE course_enrollments_sql 
            SET progress_percent = ?, videos_watched_json = ?, updated_at = ?
            WHERE id = ?`,
      args: [progressPercent, JSON.stringify(watchedList), now, enrollment.id],
    });

    return NextResponse.json({
      success: true,
      progress: progressPercent,
      videosWatched: watchedList.length,
    });
  } catch (error: any) {
    console.error('[Video Progress Error]:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
>>>>>>> 9f221716 (feat(rag-video): migrate to Bunny DB, replace HeyGen with Replicate & OpenAI, add MP4 Whisper transcription)
