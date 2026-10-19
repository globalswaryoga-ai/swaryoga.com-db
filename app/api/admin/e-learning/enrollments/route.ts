/**
 * Admin API for E-Learning Enrollments (BunnyDB)
 * GET /api/admin/e-learning/enrollments - List all enrollments
 * GET /api/admin/e-learning/enrollments?enrollmentId=... - Get enrollment details
 * PUT /api/admin/e-learning/enrollments - Update enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initCourseSchema,
  saveEnrollment,
  getCourseById,
  listDevices,
  deleteEnrollment,
  listVideosByCourse,
  listWatchLogs,
  logWatchProgress,
  registerDevice,
} from '@/lib/bunnyCourseRepository';
import { getUserByEmail, upsertUser } from '@/lib/repositories/userRepository';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

function parseDeviceFromUserAgent(ua: string): string {
  if (!ua) return 'Web Browser';
  if (/iPhone/i.test(ua)) return 'Apple iPhone';
  if (/iPad/i.test(ua)) return 'Apple iPad';
  if (/Android.*Mobile|Mobile/i.test(ua)) return 'Android Mobile';
  if (/Android/i.test(ua)) return 'Android Tablet';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'MacBook / Mac OS';
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 10/11 PC';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux PC';
  return 'Desktop / Mobile Device';
}

function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (!ua) return 'desktop';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (!ua) return 'Browser';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//i.test(ua)) return 'Google Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Apple Safari';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  return 'Web Browser';
}

function parseOS(ua: string): string {
  if (!ua) return 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) return 'Windows 10/11';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone OS|iOS/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

async function findStudentUser(userId: string, dataJson?: Record<string, any>) {
  const student: any = {
    _id: userId,
    name: dataJson?.name || 'Student',
    email: dataJson?.email || (userId.includes('@') ? userId : ''),
    phone: dataJson?.phone || '',
    country: dataJson?.country || '',
    state: dataJson?.state || '',
    city: dataJson?.city || '',
    gender: dataJson?.gender || '',
    profession: '',
    ip: dataJson?.ipAddress || dataJson?.clientIp || dataJson?.ip || '',
    lastActiveAt: dataJson?.lastActiveAt || dataJson?.unlockedAt || '',
    userAgent: dataJson?.userAgent || '',
    deviceType: '',
  };

  try {
    // 1. users table
    const u1 = await bunnyExecute({
      sql: 'SELECT * FROM users WHERE id = ? OR userId = ? OR email = ? LIMIT 1',
      args: [userId, userId, student.email || userId],
    });
    if (u1.rows[0]) {
      const row: any = u1.rows[0];
      if (row.name) student.name = String(row.name);
      if (row.email) student.email = String(row.email);
      if (row.phone) student.phone = String(row.phone);
      if (row.country) student.country = String(row.country);
      if (row.state) student.state = String(row.state);
      if (row.city) student.city = String(row.city);
      if (row.profession) student.profession = String(row.profession);
      if (row.ip || row.ipAddress || row.lastLoginIp) student.ip = String(row.ip || row.ipAddress || row.lastLoginIp);
      if (row.lastLoginAt || row.updatedAt) student.lastActiveAt = String(row.lastLoginAt || row.updatedAt);
    }

    // 2. Query website_visitors_sql for latest visitor record, IP, geo, user agent
    const cleanPhone = (student.phone || '').replace(/\D/g, '');
    const vRes = await bunnyExecute({
      sql: `SELECT * FROM website_visitors_sql
            WHERE visitor_email = ? OR visitor_phone = ? OR (visitor_phone != '' AND ? != '' AND visitor_phone LIKE ?)
            ORDER BY created_at DESC LIMIT 5`,
      args: [
        student.email || userId,
        student.phone || '',
        cleanPhone,
        `%${cleanPhone.slice(-10)}%`,
      ],
    }).catch(() => ({ rows: [] }));

    if (vRes.rows.length > 0) {
      const v: any = vRes.rows[0];
      if (!student.name || student.name === 'Student') student.name = String(v.visitor_name || student.name);
      if (!student.email) student.email = String(v.visitor_email || student.email);
      if (!student.phone) student.phone = String(v.visitor_phone || student.phone);
      if (!student.country) student.country = String(v.country || student.country);
      if (!student.state) student.state = String(v.state || student.state);
      if (!student.city) student.city = String(v.city || student.city);
      if (!student.ip || student.ip === '127.0.0.1') student.ip = String(v.ip || student.ip);
      if (!student.lastActiveAt) student.lastActiveAt = String(v.created_at || student.lastActiveAt);
      if (v.user_agent) student.userAgent = String(v.user_agent);
      if (v.device_type) student.deviceType = String(v.device_type);
    }
  } catch (err) {
    console.warn('[findStudentUser Error]:', err);
  }

  return student;
}

export async function GET(request: NextRequest) {
  try {
    await initCourseSchema();

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

    const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');

    // Get specific enrollment details
    if (enrollmentId) {
      const res = await bunnyExecute({
        sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
        args: [enrollmentId],
      });

      if (!res.rows[0]) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const row: any = res.rows[0];
      const courseId = String(row.course_id);
      const userId = String(row.user_id);

      // Parse data_json
      let dataJson: Record<string, any> = {};
      try {
        dataJson = row.data_json ? JSON.parse(String(row.data_json)) : {};
      } catch {
        dataJson = {};
      }

      const course = await getCourseById(courseId);
      const studentUser = await findStudentUser(userId, dataJson);

      // Fetch watch logs for this user & course
      const rawWatchLogs = await listWatchLogs(userId, courseId);

      // Fetch all course videos
      const rawVideos = await listVideosByCourse(courseId, false);

      const disabledVideoIds: string[] = Array.isArray(dataJson.disabledVideoIds)
        ? dataJson.disabledVideoIds
        : Array.isArray(dataJson.disabledVideos)
        ? dataJson.disabledVideos
        : [];
      const videoGiftTimes: Record<string, number> = dataJson.videoGiftTimes || {};

      let completedVideoIds: string[] = [];
      if (Array.isArray(dataJson.completedVideoIds)) {
        completedVideoIds = dataJson.completedVideoIds;
      } else if (Array.isArray(dataJson.completedVideos)) {
        completedVideoIds = dataJson.completedVideos.map((c: any) => (typeof c === 'string' ? c : c.videoId));
      } else if (row.videos_watched_json) {
        try {
          completedVideoIds = JSON.parse(String(row.videos_watched_json));
        } catch {
          completedVideoIds = [];
        }
      }

      // Calculate watch times per video and total watch time
      let totalWatchSeconds = 0;
      const videoWatchTimes: Record<string, number> = {};

      for (const log of rawWatchLogs) {
        videoWatchTimes[log.videoId] = log.watchTime;
        totalWatchSeconds += log.watchTime;
      }

      if (dataJson.videoProgress && typeof dataJson.videoProgress === 'object') {
        for (const [vid, p] of Object.entries(dataJson.videoProgress)) {
          const sec = typeof p === 'object' ? Number((p as any).watchedSeconds || 0) : Number(p || 0);
          if (!videoWatchTimes[vid] || sec > videoWatchTimes[vid]) {
            totalWatchSeconds += (sec - (videoWatchTimes[vid] || 0));
            videoWatchTimes[vid] = sec;
          }
          if (typeof p === 'object' && (p as any).isCompleted && !completedVideoIds.includes(vid)) {
            completedVideoIds.push(vid);
          }
        }
      }

      if (totalWatchSeconds === 0 && Number(dataJson.totalWatchTime || 0) > 0) {
        totalWatchSeconds = Number(dataJson.totalWatchTime);
      }

      // Build video list with watch progress and settings
      const videos = rawVideos.map((v) => {
        const watchSeconds = videoWatchTimes[v.id] || 0;
        const duration = Number(v.duration || 0);
        const isCompleted = completedVideoIds.includes(v.id) || (duration > 0 && watchSeconds >= duration * 0.9);
        const isEnabled = !disabledVideoIds.includes(v.id);
        const giftMinutes = Number(videoGiftTimes[v.id] || 0);
        const progressPercent = duration > 0
          ? Math.min(100, Math.round((watchSeconds / duration) * 100))
          : (isCompleted ? 100 : 0);

        return {
          _id: v.id,
          id: v.id,
          title: v.title || 'Untitled Video',
          description: v.description || '',
          duration,
          thumbnail: (v as any).thumbnail || v.content?.thumbnail || '',
          level: (v as any).level || v.content?.level || course?.level || 'Beginner',
          displayOrder: v.order ?? 1,
          sectionId: v.sectionId || '',
          isFree: Boolean(v.isFree),
          isActive: Boolean(v.isActive),
          isEnabled,
          canWatch: isEnabled,
          isCompleted,
          watchSeconds,
          progressPercent,
          giftMinutes,
        };
      });

      // Get Devices from course_devices_sql
      let rawDevices = await listDevices(userId, courseId, false);
      if (rawDevices.length === 0) {
        rawDevices = await listDevices(userId, undefined, false);
      }

      let devices = rawDevices.map((d) => ({
        _id: d.id,
        id: d.id,
        userId: d.userId,
        courseId: d.courseId,
        deviceFingerprint: d.deviceFingerprint,
        deviceName: d.deviceName || `${d.browser || 'Browser'} on ${d.os || 'Device'}`,
        deviceType: d.deviceType || 'desktop',
        browser: d.browser || 'Unknown',
        os: d.os || 'Unknown',
        ip: d.ip || '',
        location: (d.data as any)?.location || '',
        isActive: d.isActive,
        isBlocked: !d.isActive,
        lastUsedAt: d.lastActiveAt || d.createdAt,
        registeredAt: d.createdAt,
      }));

      // Fallback: Check website_visitors_sql if no devices registered yet
      if (devices.length === 0) {
        const cleanPhone = (studentUser.phone || '').replace(/\D/g, '');
        const vList = await bunnyExecute({
          sql: `SELECT DISTINCT ip, user_agent, device_type, country, state, city, created_at
                FROM website_visitors_sql
                WHERE visitor_email = ? OR visitor_phone = ? OR (visitor_phone != '' AND ? != '' AND visitor_phone LIKE ?)
                ORDER BY created_at DESC LIMIT 5`,
          args: [
            studentUser.email || userId,
            studentUser.phone || '',
            cleanPhone,
            `%${cleanPhone.slice(-10)}%`,
          ],
        }).catch(() => ({ rows: [] }));

        if (vList.rows.length > 0) {
          devices = vList.rows.map((v: any, index: number) => {
            const ua = String(v.user_agent || '');
            const devName = parseDeviceFromUserAgent(ua);
            const devBrowser = parseBrowser(ua);
            const devOs = parseOS(ua);
            const devType = (v.device_type as any) || detectDeviceType(ua);
            const loc = [v.city, v.state, v.country].filter(Boolean).join(', ');

            return {
              _id: `vis_dev_${index}_${String(v.ip || 'ip').replace(/[^a-zA-Z0-9]/g, '_')}`,
              id: `vis_dev_${index}_${String(v.ip || 'ip').replace(/[^a-zA-Z0-9]/g, '_')}`,
              userId,
              courseId,
              deviceFingerprint: `dev_${String(v.ip || '').replace(/[^a-zA-Z0-9]/g, '_')}`,
              deviceName: `${devName} (${devBrowser})`,
              deviceType: devType,
              browser: devBrowser,
              os: devOs,
              ip: String(v.ip || ''),
              location: loc,
              isActive: true,
              isBlocked: false,
              lastUsedAt: String(v.created_at || ''),
              registeredAt: String(v.created_at || ''),
            };
          });

          // Auto-persist first detected device to course_devices_sql
          if (devices[0]) {
            registerDevice({
              userId,
              courseId,
              deviceFingerprint: devices[0].deviceFingerprint,
              deviceName: devices[0].deviceName,
              deviceType: devices[0].deviceType,
              browser: devices[0].browser,
              os: devices[0].os,
              ip: devices[0].ip,
            }).catch(() => {});
          }
        }
      }

      // Fallback: check user_signins if still no devices
      if (devices.length === 0) {
        const signinRes = await bunnyExecute({
          sql: 'SELECT * FROM user_signins WHERE userId = ? OR email = ? ORDER BY createdAt DESC LIMIT 5',
          args: [userId, studentUser.email || ''],
        }).catch(() => ({ rows: [] }));

        if (signinRes.rows.length > 0) {
          devices = signinRes.rows.map((s: any) => ({
            _id: String(s.id),
            id: String(s.id),
            userId,
            courseId,
            deviceFingerprint: String(s.id).slice(0, 16),
            deviceName: parseDeviceFromUserAgent(s.userAgent || ''),
            deviceType: detectDeviceType(s.userAgent || ''),
            browser: parseBrowser(s.userAgent || ''),
            os: parseOS(s.userAgent || ''),
            ip: s.ipAddress || '',
            location: '',
            isActive: true,
            isBlocked: false,
            lastUsedAt: s.createdAt,
            registeredAt: s.createdAt,
          }));
        }
      }

      // Determine primary IP, location, and device
      const primaryIp =
        studentUser.ip ||
        devices.find((d) => d.ip && d.ip !== '127.0.0.1')?.ip ||
        (dataJson.ipAddress || dataJson.clientIp || dataJson.ip) ||
        devices[0]?.ip ||
        '';

      const primaryLocation =
        [studentUser.city, studentUser.state, studentUser.country].filter(Boolean).join(', ') ||
        devices[0]?.location ||
        '';

      const primaryDevice = devices[0]?.deviceName || 'MacBook / Mac OS';

      studentUser.ip = primaryIp;
      studentUser.location = primaryLocation;
      studentUser.device = primaryDevice;

      // Recalculate progress percent
      const totalVideosCount = videos.length || 6;
      const completedCount = completedVideoIds.length;
      const progressPercent = Math.min(100, Math.round((completedCount / totalVideosCount) * 100));

      const enrollment = {
        _id: String(row.id),
        id: String(row.id),
        userId: studentUser,
        courseId: course ? {
          _id: course.id,
          id: course.id,
          slug: course.slug,
          content: course.content,
          level: course.level,
          title: course.content?.en?.title || course.slug,
        } : {
          _id: courseId,
          id: courseId,
          slug: courseId,
          content: { en: { title: 'Course' } },
          level: 'Beginner',
          title: 'Course',
        },
        status: row.status || 'active',
        enrolledAt: row.enrolled_at,
        expiresAt: row.expires_at,
        progress: progressPercent,
        progressPercent: progressPercent,
        purchaseType: dataJson.purchaseType || 'paid',
        amountPaid: dataJson.amountPaid || 0,
        giftHoursRemaining: Number(dataJson.giftHoursRemaining ?? dataJson.giftHours ?? 0),
        totalWatchTime: totalWatchSeconds,
        communityLinks: dataJson.communityLinks || {},
        disabledVideoIds,
        videoGiftTimes,
        completedVideoIds,
      };

      const watchLogsFormatted = rawWatchLogs.map((log) => {
        const video = rawVideos.find((v) => v.id === log.videoId);
        return {
          _id: `${log.userId}_${log.videoId}`,
          videoId: log.videoId,
          videoTitle: video?.title || 'Course Video',
          watchStarted: log.lastWatchedAt,
          watchDuration: log.watchTime,
          isCompleted: log.completed,
        };
      });

      // Gather All Student Timeline Events
      const allEvents: any[] = [];

      // 1. Enrollment / Joined event
      const enrolledTimestamp = row.enrolled_at || dataJson.unlockedAt || row.created_at;
      if (enrolledTimestamp) {
        allEvents.push({
          id: `enrolled_${row.id}`,
          type: 'joined',
          title: `Joined Course: ${course?.content?.en?.title || 'Swar Yoga Workshop'}`,
          subtitle: 'Unlocked all workshop videos via student access',
          details: `Enrolled successfully • User: ${studentUser.name || 'Student'}`,
          badge: 'Joined',
          ip: primaryIp,
          device: primaryDevice,
          location: primaryLocation,
          timestamp: enrolledTimestamp,
        });
      }

      // 2. Video watch events
      rawWatchLogs.forEach((log) => {
        const video = rawVideos.find((v) => v.id === log.videoId);
        const mins = Math.floor(log.watchTime / 60);
        const secs = log.watchTime % 60;
        const durStr = `${mins}m ${secs}s`;
        const isDone = log.completed || (video && video.duration > 0 && log.watchTime >= video.duration * 0.9);

        allEvents.push({
          id: `watch_${log.userId}_${log.videoId}`,
          type: 'watch',
          title: video ? `Watched: ${video.title}` : 'Watched Video',
          subtitle: `Watched ${durStr}${video ? ` of ${Math.floor(video.duration / 60)}m ${video.duration % 60}s` : ''}`,
          details: isDone ? 'Video completed 100%' : 'Playback in progress',
          badge: isDone ? 'Completed' : 'Watching',
          videoTitle: video?.title || 'Course Video',
          watchDuration: log.watchTime,
          ip: primaryIp,
          device: primaryDevice,
          location: primaryLocation,
          timestamp: log.lastWatchedAt,
        });
      });

      // Also check videoProgress from dataJson if logs were missing
      if (dataJson.videoProgress && typeof dataJson.videoProgress === 'object') {
        for (const [vid, p] of Object.entries(dataJson.videoProgress)) {
          const alreadyLogged = rawWatchLogs.some((l) => l.videoId === vid);
          if (!alreadyLogged) {
            const video = rawVideos.find((v) => v.id === vid);
            const sec = typeof p === 'object' ? Number((p as any).watchedSeconds || 0) : Number(p || 0);
            const mins = Math.floor(sec / 60);
            const secs = sec % 60;
            const durStr = `${mins}m ${secs}s`;
            const isDone = typeof p === 'object' ? Boolean((p as any).isCompleted) : false;
            const lastAt = typeof p === 'object' ? (p as any).lastWatchedAt : enrolledTimestamp;

            allEvents.push({
              id: `vprog_${vid}`,
              type: 'watch',
              title: video ? `Watched: ${video.title}` : 'Watched Video',
              subtitle: `Watched ${durStr}`,
              details: isDone ? 'Video completed 100%' : 'Playback progress recorded',
              badge: isDone ? 'Completed' : 'Watching',
              videoTitle: video?.title || 'Course Video',
              watchDuration: sec,
              ip: primaryIp,
              device: primaryDevice,
              location: primaryLocation,
              timestamp: lastAt || enrolledTimestamp,
            });
          }
        }
      }

      // 3. Website page visits & learning sessions
      const cleanPhone = (studentUser.phone || '').replace(/\D/g, '');
      const visitorLogs = await bunnyExecute({
        sql: `SELECT id, page_url, ip, user_agent, device_type, country, state, city, created_at
              FROM website_visitors_sql
              WHERE visitor_email = ? OR visitor_phone = ? OR (visitor_phone != '' AND ? != '' AND visitor_phone LIKE ?)
              ORDER BY created_at DESC LIMIT 30`,
        args: [
          studentUser.email || userId,
          studentUser.phone || '',
          cleanPhone,
          `%${cleanPhone.slice(-10)}%`,
        ],
      }).catch(() => ({ rows: [] }));

      for (const rawV of visitorLogs.rows) {
        const v = rawV as any;
        const pageUrl = String(v.page_url || '');
        let pageTitle = 'Visited Swaryoga Platform';
        if (pageUrl.includes('/learn')) pageTitle = 'Opened E-Learning Course Player';
        else if (pageUrl.includes('/videos')) pageTitle = 'Viewed Workshop Videos Playlist';
        else if (pageUrl.includes('/e-learning')) pageTitle = 'Browsed E-Learning Portal';
        else if (pageUrl.includes('/courses')) pageTitle = 'Explored Courses Catalog';

        allEvents.push({
          id: `vis_${v.id}`,
          type: 'visit',
          title: pageTitle,
          subtitle: pageUrl,
          details: [v.city, v.state, v.country].filter(Boolean).join(', ') || 'Online Session',
          badge: 'Online',
          ip: v.ip || primaryIp,
          device: parseDeviceFromUserAgent(v.user_agent || ''),
          location: [v.city, v.state, v.country].filter(Boolean).join(', '),
          timestamp: v.created_at,
        });
      }

      // 4. Assignment Submissions
      const subRes = await bunnyExecute({
        sql: 'SELECT id, submitted_at, data_json FROM course_assignment_submissions_sql WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 5',
        args: [userId],
      }).catch(() => ({ rows: [] }));

      for (const rawSub of subRes.rows) {
        const sub = rawSub as any;
        let subData: any = {};
        try { subData = JSON.parse(sub.data_json || '{}'); } catch {}
        allEvents.push({
          id: `sub_${sub.id}`,
          type: 'submission',
          title: subData.title ? `Submitted Assignment: ${subData.title}` : 'Submitted Assignment',
          subtitle: subData.score !== undefined && subData.score !== null ? `Score: ${subData.score}/${subData.total || 100}` : 'Completed',
          details: 'Submitted practice task',
          badge: 'Submitted',
          ip: primaryIp,
          device: primaryDevice,
          location: primaryLocation,
          timestamp: sub.submitted_at,
        });
      }

      // Sort all events by timestamp DESC
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Group Events into Daily Activity Timeline
      const dailyMap: Record<string, any> = {};

      allEvents.forEach((ev) => {
        let dateKey = 'Earlier';
        let displayDate = 'Earlier Activity';
        try {
          const d = new Date(ev.timestamp);
          if (!isNaN(d.getTime())) {
            dateKey = d.toISOString().split('T')[0];
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

            const dateLabel = d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            if (dateKey === todayStr) {
              displayDate = `Today • ${dateLabel}`;
            } else if (dateKey === yesterdayStr) {
              displayDate = `Yesterday • ${dateLabel}`;
            } else {
              displayDate = dateLabel;
            }
          }
        } catch {}

        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            dateKey,
            displayDate,
            totalWatchSeconds: 0,
            seenVideoTitles: new Set<string>(),
            events: [],
          };
        }

        if (ev.type === 'watch') {
          dailyMap[dateKey].totalWatchSeconds += (ev.watchDuration || 0);
          if (ev.videoTitle) {
            dailyMap[dateKey].seenVideoTitles.add(ev.videoTitle);
          }
        }

        dailyMap[dateKey].events.push(ev);
      });

      const dailyActivity = Object.values(dailyMap)
        .map((group: any) => ({
          dateKey: group.dateKey,
          displayDate: group.displayDate,
          totalWatchSeconds: group.totalWatchSeconds,
          videosSeenCount: group.seenVideoTitles.size,
          events: group.events,
        }))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      const primaryLastUsed =
        allEvents[0]?.timestamp ||
        devices[0]?.lastUsedAt ||
        studentUser.lastActiveAt ||
        row.enrolled_at;

      studentUser.lastUsedAt = primaryLastUsed;

      return NextResponse.json({
        success: true,
        enrollment: {
          ...enrollment,
          userId: {
            ...studentUser,
            ip: primaryIp,
            lastUsedAt: primaryLastUsed,
            location: primaryLocation,
            device: primaryDevice,
          },
        },
        videos,
        devices,
        watchLogs: watchLogsFormatted,
        recentActivity: allEvents,
        dailyActivity,
        primaryIp,
        primaryLocation,
        primaryDevice,
        primaryLastUsed,
      });
    }

    // List all enrollments
    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const conditions: string[] = [];
    const args: any[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      args.push(userId);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      args.push(courseId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await bunnyExecute({
      sql: `SELECT COUNT(*) as cnt FROM course_enrollments_sql ${where}`,
      args,
    });
    const total = Number(countRes.rows[0]?.cnt || 0);

    const offset = (page - 1) * limit;
    const listRes = await bunnyExecute({
      sql: `SELECT * FROM course_enrollments_sql ${where} ORDER BY enrolled_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    const enrollments = await Promise.all(
      listRes.rows.map(async (row: any) => {
        const c = await getCourseById(String(row.course_id));
        const u = await findStudentUser(String(row.user_id));
        let dJson: any = {};
        try { dJson = row.data_json ? JSON.parse(String(row.data_json)) : {}; } catch {}
        return {
          _id: String(row.id),
          id: String(row.id),
          userId: u,
          courseId: c ? { _id: c.id, slug: c.slug, content: c.content, level: c.level, title: c.content?.en?.title || c.slug } : String(row.course_id),
          status: row.status,
          enrolledAt: row.enrolled_at,
          expiresAt: row.expires_at,
          progress: Number(row.progress_percent || dJson.progress || 0),
          progressPercent: Number(row.progress_percent || dJson.progress || 0),
          purchaseType: dJson.purchaseType || 'paid',
          giftHoursRemaining: Number(dJson.giftHoursRemaining ?? dJson.giftHours ?? 0),
        };
      })
    );

    return NextResponse.json({
      success: true,
      enrollments,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('[Enrollments GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initCourseSchema();

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
    const {
      enrollmentId,
      status,
      expiresAt,
      progressPercent,
      progress,
      giftHoursRemaining,
      communityLinks,
      disabledVideoIds,
      videoGiftTimes,
      completedVideoIds,
      videoWatchTimes,
    } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    const res = await bunnyExecute({
      sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
      args: [enrollmentId],
    });

    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const row: any = res.rows[0];
    let existingData: Record<string, any> = {};
    try {
      existingData = row.data_json ? JSON.parse(String(row.data_json)) : {};
    } catch {
      existingData = {};
    }

    // Merge settings
    const updatedData: Record<string, any> = {
      ...existingData,
      ...(communityLinks !== undefined && { communityLinks }),
      ...(giftHoursRemaining !== undefined && { giftHoursRemaining: Number(giftHoursRemaining) }),
      ...(disabledVideoIds !== undefined && { disabledVideoIds }),
      ...(videoGiftTimes !== undefined && { videoGiftTimes }),
      ...(completedVideoIds !== undefined && { completedVideoIds }),
      ...(videoWatchTimes !== undefined && { videoProgress: videoWatchTimes }),
    };

    // If watch times or completion changed, sync video_watch_logs_sql
    if (videoWatchTimes && typeof videoWatchTimes === 'object') {
      for (const [vid, secs] of Object.entries(videoWatchTimes)) {
        const isDone = Array.isArray(completedVideoIds) ? completedVideoIds.includes(vid) : false;
        try {
          await logWatchProgress(String(row.user_id), vid, String(row.course_id), Number(secs) || 0, isDone);
        } catch (e) {
          console.warn('[Sync watch log error]:', e);
        }
      }
    }

    const finalProgress = progressPercent !== undefined
      ? Number(progressPercent)
      : progress !== undefined
      ? Number(progress)
      : Number(row.progress_percent || 0);

    const updated = await saveEnrollment({
      id: enrollmentId,
      userId: String(row.user_id),
      courseId: String(row.course_id),
      status: status || row.status,
      expiresAt: expiresAt !== undefined ? expiresAt : row.expires_at,
      progressPercent: finalProgress,
      videosWatched: Array.isArray(completedVideoIds) ? completedVideoIds : undefined,
      data: updatedData,
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        ...updated,
        progress: finalProgress,
        progressPercent: finalProgress,
        giftHoursRemaining: Number(updatedData.giftHoursRemaining || 0),
        communityLinks: updatedData.communityLinks || {},
        disabledVideoIds: updatedData.disabledVideoIds || [],
        videoGiftTimes: updatedData.videoGiftTimes || {},
        completedVideoIds: updatedData.completedVideoIds || [],
      },
    });
  } catch (error: any) {
    console.error('[Enrollments PUT Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initCourseSchema();

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
    const { name, email, phone, courseId, level, status = 'active', password } = body;

    if (!email || !courseId) {
      return NextResponse.json({ error: 'Email and Course ID are required' }, { status: 400 });
    }

    // Check or create user
    let user = await getUserByEmail(email);
    let generatedPassword = '';
    if (!user) {
      generatedPassword = password || `Swar@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      user = await upsertUser({
        email,
        name: name || email.split('@')[0],
        phone: phone || '',
        password: hashedPassword,
        role: 'student',
        status: 'active',
        isAdmin: false,
        provider: 'admin-manual',
        emailVerified: true,
        managedUserIds: [],
        permissions: ['course:read'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const userId = (user as any)?.id || (user as any)?._id || email;

    const newEnrollment = await saveEnrollment({
      userId: String(userId),
      courseId: String(courseId),
      status: status || 'active',
      progressPercent: 0,
      data: {
        enrolledBy: decoded?.email || 'admin',
        studentLevel: level || 'beginner',
        studentName: name || '',
        studentPhone: phone || '',
        enrolledAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Student enrolled successfully',
      enrollment: newEnrollment,
      generatedPassword: generatedPassword || undefined,
    });
  } catch (error: any) {
    console.error('[Enrollments POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to add student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initCourseSchema();

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

    const enrollmentId = request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('enrollmentId');
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }

    const deleted = await deleteEnrollment(enrollmentId);
    if (!deleted) {
      return NextResponse.json({ error: 'Enrollment not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Student enrollment deleted successfully',
    });
  } catch (error: any) {
    console.error('[Enrollments DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete student' }, { status: 500 });
  }
}
