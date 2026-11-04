/**

 * Admin API for E-Learning Enrollments (Bunny Database / LibSQL)
 * GET /api/admin/e-learning/enrollments - List all enrollments
 * GET /api/admin/e-learning/enrollments?enrollmentId=... - Get enrollment details
 * PUT /api/admin/e-learning/enrollments - Update enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

import { bunnyExecute, isBunnyDatabaseConfigured } from '@/lib/bunnyDatabase';

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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const enrollmentId = request.nextUrl.searchParams.get('enrollmentId');

    // Get specific enrollment details
    if (enrollmentId) {

      const enrollRes = await bunnyExecute({
        sql: 'SELECT * FROM course_enrollments_sql WHERE id = ? LIMIT 1',
        args: [enrollmentId],
      });


      if (!enrollRes.rows.length) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
      }

      const raw = enrollRes.rows[0];
      const devicesRes = await bunnyExecute({
        sql: 'SELECT * FROM course_devices_sql WHERE user_id = ? AND course_id = ?',
        args: [raw.user_id, raw.course_id],
      });

      let data: any = {};
      try {
        data = raw.data_json ? JSON.parse(String(raw.data_json)) : {};
      } catch {}

      return NextResponse.json({
        success: true,
        enrollment: {

          _id: raw.id,
          id: raw.id,
          userId: raw.user_id,
          courseId: raw.course_id,
          status: raw.status,
          enrolledAt: raw.enrolled_at || raw.created_at,
          expiresAt: raw.expires_at,
          progress: Number(raw.progress_percent) || 0,
          ...data,
        },
        watchLogs: [],
        devices: devicesRes.rows,
      });
    }

    // List all enrollments
    const userId = request.nextUrl.searchParams.get('userId');
    const courseId = request.nextUrl.searchParams.get('courseId');

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');


    let sql = 'SELECT * FROM course_enrollments_sql WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM course_enrollments_sql WHERE 1=1';
    const args: any[] = [];
    const countArgs: any[] = [];

    if (userId) {
      sql += ' AND user_id = ?';
      countSql += ' AND user_id = ?';
      args.push(userId);
      countArgs.push(userId);
    }
    if (courseId) {
      sql += ' AND course_id = ?';
      countSql += ' AND course_id = ?';
      args.push(courseId);
      countArgs.push(courseId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, (page - 1) * limit);

    const [listRes, countRes] = await Promise.all([
      bunnyExecute({ sql, args }),
      bunnyExecute({ sql: countSql, args: countArgs }),
    ]);

    const total = Number(countRes.rows[0]?.total) || 0;

    const enrollments = listRes.rows.map((r: any) => {
      let data: any = {};
      try {
        data = r.data_json ? JSON.parse(String(r.data_json)) : {};
      } catch {}
      return {
        _id: r.id,
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        status: r.status,
        enrolledAt: r.enrolled_at || r.created_at,
        expiresAt: r.expires_at,
        progress: Number(r.progress_percent) || 0,
        ...data,
      };
    });

    return NextResponse.json({
      success: true,
      enrollments,
      total,
      stats,
      timeframe,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('[Enrollments GET Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


/**
 * PUT - Update enrollment
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

    if (!isBunnyDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();

    const { enrollmentId, status, progress, expiresAt, ...extra } = body;

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 });
    }


    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `UPDATE course_enrollments_sql 
            SET status = COALESCE(?, status),
                progress_percent = COALESCE(?, progress_percent),
                expires_at = COALESCE(?, expires_at),
                data_json = COALESCE(?, data_json),
                updated_at = ?
            WHERE id = ?`,
      args: [
        status || null,
        progress !== undefined ? progress : null,
        expiresAt || null,
        Object.keys(extra).length ? JSON.stringify(extra) : null,
        now,
        enrollmentId,
      ],
    });

    return NextResponse.json({
      success: true,
      enrollment: { id: enrollmentId, _id: enrollmentId },
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
