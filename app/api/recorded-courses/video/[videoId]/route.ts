/**

 * Course Video Streaming API (Bunny Database / LibSQL)
 * GET /api/recorded-courses/video/[videoId] - Get video streaming URL
 * POST /api/recorded-courses/video/[videoId] - Update watch progress
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';

import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ videoId: string }>;
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
