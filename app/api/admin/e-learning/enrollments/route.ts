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

async function findStudentUser(userId: string) {
  try {
    // 1. users table
    const u1 = await bunnyExecute({
      sql: 'SELECT * FROM users WHERE id = ? OR userId = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u1.rows[0]) {
      const row: any = u1.rows[0];
      return {
        _id: String(row.id || row.userId || userId),
        name: String(row.name || 'Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
        country: row.country ? String(row.country) : '',
        state: row.state ? String(row.state) : '',
        profession: row.profession ? String(row.profession) : '',
        ip: String(row.ip || row.ipAddress || row.lastLoginIp || row.clientIp || ''),
        lastActiveAt: String(row.lastLoginAt || row.updatedAt || row.createdAt || ''),
      };
    }

    // 2. admin_users_sql
    const u2 = await bunnyExecute({
      sql: 'SELECT * FROM admin_users_sql WHERE id = ? OR user_id = ? LIMIT 1',
      args: [userId, userId],
    });
    if (u2.rows[0]) {
      const row: any = u2.rows[0];
      return {
        _id: String(row.id || row.user_id || userId),
        name: String(row.name || 'Admin / Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
        country: '',
        state: '',
        profession: '',
      };
    }

    // 3. mongo_documents (collection 'users')
    const u3 = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'users' AND document_id = ? LIMIT 1",
      args: [userId],
    });
    if (u3.rows[0]) {
      try {
        const doc = JSON.parse(String(u3.rows[0].document_json));
        return {
          _id: String(doc._id?.$oid || doc._id || userId),
          name: String(doc.name || 'Student'),
          email: String(doc.email || ''),
          phone: String(doc.phone || ''),
          country: String(doc.country || ''),
          state: String(doc.state || ''),
          profession: String(doc.profession || '').replace(/%098/g, ' '),
          ip: String(doc.ipAddress || doc.clientIp || doc.lastLoginIp || doc.ip || ''),
          lastActiveAt: String(doc.lastLoginAt || doc.updatedAt || doc.createdAt || ''),
        };
      } catch {
        // ignore parse error
      }
    }

    // 4. crm_leads_sql
    const u4 = await bunnyExecute({
      sql: 'SELECT * FROM crm_leads_sql WHERE id = ? LIMIT 1',
      args: [userId],
    });
    if (u4.rows[0]) {
      const row: any = u4.rows[0];
      return {
        _id: String(row.id || userId),
        name: String(row.name || 'Lead / Student'),
        email: String(row.email || ''),
        phone: row.phone ? String(row.phone) : '',
        country: row.country ? String(row.country) : '',
        state: row.state ? String(row.state) : '',
        profession: '',
        ip: String(row.ip || ''),
        lastActiveAt: String(row.updated_at || row.created_at || ''),
      };
    }
  } catch (err) {
    console.warn('[findStudentUser Error]:', err);
  }

  return {
    _id: userId,
    name: 'Student',
    email: '',
    phone: '',
    country: '',
    state: '',
    profession: '',
    ip: '',
    lastActiveAt: '',
  };
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
      const course = await getCourseById(courseId);
      const studentUser = await findStudentUser(userId);

      // Parse data_json
      let dataJson: Record<string, any> = {};
      try {
        dataJson = row.data_json ? JSON.parse(String(row.data_json)) : {};
      } catch {
        dataJson = {};
      }

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

      if (totalWatchSeconds === 0 && Number(dataJson.totalWatchTime || 0) > 0) {
        totalWatchSeconds = Number(dataJson.totalWatchTime);
      }
      if (dataJson.videoProgress && typeof dataJson.videoProgress === 'object') {
        for (const [vid, sec] of Object.entries(dataJson.videoProgress)) {
          if (!videoWatchTimes[vid]) {
            videoWatchTimes[vid] = Number(sec) || 0;
            totalWatchSeconds += Number(sec) || 0;
          }
        }
      }

      // Build video list with watch progress and settings
      const videos = rawVideos.map((v) => {
        const watchSeconds = videoWatchTimes[v.id] || 0;
        const duration = Number(v.duration || 0);
        const isCompleted = completedVideoIds.includes(v.id);
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
          // Student specific settings:
          isEnabled, // Watch Access Toggle (keep ON or OFF)
          canWatch: isEnabled,
          isCompleted,
          watchSeconds,
          progressPercent,
          giftMinutes,
        };
      });

      // Get Devices
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

      // Fallback: check user_signins if no devices registered yet
      if (devices.length === 0) {
        const signinRes = await bunnyExecute({
          sql: 'SELECT * FROM user_signins WHERE userId = ? OR email = ? ORDER BY createdAt DESC LIMIT 5',
          args: [userId, studentUser.email || ''],
        });
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

      const progressPercent = Number(row.progress_percent ?? dataJson.progress ?? 0);

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

      // Build comprehensive Recent Activity list (Signins, Watches, Devices, Submissions)
      const activityEvents: any[] = [];

      // 1. Devices activity
      devices.forEach((d) => {
        if (d.lastUsedAt || d.registeredAt) {
          activityEvents.push({
            id: `dev_${d.id}`,
            type: 'device',
            title: d.deviceName || 'Device Active',
            subtitle: [d.browser, d.os].filter(Boolean).join(' • ') || 'Web Client',
            ip: d.ip || '',
            timestamp: d.lastUsedAt || d.registeredAt,
          });
        }
      });

      // 2. User signins from user_signins
      const signinRes = await bunnyExecute({
        sql: 'SELECT * FROM user_signins WHERE userId = ? OR email = ? ORDER BY createdAt DESC LIMIT 10',
        args: [userId, studentUser.email || ''],
      }).catch(() => ({ rows: [] }));

      for (const rawS of signinRes.rows) {
        const s = rawS as any;
        activityEvents.push({
          id: `signin_${s.id}`,
          type: 'signin',
          title: 'User Login / Session',
          subtitle: parseDeviceFromUserAgent(s.userAgent || ''),
          ip: s.ipAddress || '',
          timestamp: s.createdAt,
        });
      }

      // 3. Watch logs
      rawWatchLogs.forEach((log) => {
        const video = rawVideos.find((v) => v.id === log.videoId);
        activityEvents.push({
          id: `watch_${log.userId}_${log.videoId}`,
          type: 'watch',
          title: video ? `Watched: ${video.title}` : 'Watched Video',
          subtitle: `${Math.round(log.watchTime / 60)} mins watched`,
          ip: (devices[0]?.ip) || (studentUser as any).ip || '',
          timestamp: log.lastWatchedAt,
        });
      });

      // 4. Submissions
      const subRes = await bunnyExecute({
        sql: 'SELECT id, submitted_at, data_json FROM course_assignment_submissions_sql WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 5',
        args: [userId],
      }).catch(() => ({ rows: [] }));

      for (const rawSub of subRes.rows) {
        const sub = rawSub as any;
        let subData: any = {};
        try { subData = JSON.parse(sub.data_json || '{}'); } catch {}
        activityEvents.push({
          id: `sub_${sub.id}`,
          type: 'submission',
          title: subData.title ? `Submitted: ${subData.title}` : 'Submitted Assignment',
          subtitle: subData.score !== undefined && subData.score !== null ? `Score: ${subData.score}/${subData.total || 100}` : 'Completed',
          ip: (devices[0]?.ip) || (studentUser as any).ip || '',
          timestamp: sub.submitted_at,
        });
      }

      // Sort by timestamp DESC
      activityEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Find the most recent active IP and timestamp for the student
      const primaryIp = activityEvents.find((a) => a.ip && a.ip !== '127.0.0.1')?.ip ||
        devices.find((d) => d.ip && d.ip !== '127.0.0.1')?.ip ||
        (studentUser as any).ip ||
        (dataJson.ipAddress || dataJson.clientIp || dataJson.ip) ||
        (devices[0]?.ip) ||
        '';

      const primaryLastUsed = activityEvents[0]?.timestamp || devices[0]?.lastUsedAt || (studentUser as any).lastActiveAt || row.enrolled_at;

      (studentUser as any).ip = primaryIp;
      (studentUser as any).lastUsedAt = primaryLastUsed;

      return NextResponse.json({
        success: true,
        enrollment: {
          ...enrollment,
          userId: {
            ...studentUser,
            ip: primaryIp,
            lastUsedAt: primaryLastUsed,
          },
        },
        videos,
        devices,
        watchLogs: watchLogsFormatted,
        recentActivity: activityEvents,
        primaryIp,
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
