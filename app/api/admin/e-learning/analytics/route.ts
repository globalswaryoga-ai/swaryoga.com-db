/**
 * Admin API for E-Learning Analytics (BunnyDB)
 * GET /api/admin/e-learning/analytics?period=daily|weekly|monthly|yearly
 * GET /api/admin/e-learning/analytics?courseId=...
 * GET /api/admin/e-learning/analytics?userId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

function checkSuperAdminAccess(decoded: any | null): boolean {
  if (!decoded) return false;
  return isSuperAdmin(decoded);
}

function calculateDateRange(period: string): { startISO: string; endISO: string; format: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'daily':
      startDate.setDate(startDate.getDate() - 1);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString(), format: 'daily' };
    case 'weekly':
      startDate.setDate(startDate.getDate() - 7);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString(), format: 'weekly' };
    case 'yearly':
      startDate.setFullYear(startDate.getFullYear() - 1);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString(), format: 'yearly' };
    case 'monthly':
    default:
      startDate.setDate(startDate.getDate() - 30);
      return { startISO: startDate.toISOString(), endISO: endDate.toISOString(), format: 'monthly' };
  }
}

function formatDate(dateStr: string, format: string): string {
  const d = new Date(dateStr);
  if (format === 'yearly') {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

async function safeExecute(sql: string, args: any[] = []) {
  try {
    return await bunnyExecute({ sql, args });
  } catch {
    return { rows: [] };
  }
}

/**
 * GET - Analytics data from BunnyDB
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

    const period = request.nextUrl.searchParams.get('period');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const userId = request.nextUrl.searchParams.get('userId');

    // ── Dashboard analytics with period filter ──
    if (period && !courseId && !userId) {
      const { startISO, endISO, format } = calculateDateRange(period);

      // New courses published in period
      const workshopsRes = await safeExecute(
        `SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ? LIMIT 1`,
        [startISO, endISO]
      );

      // Try courses table first, fall back to 0
      const coursesRes = await safeExecute(
        `SELECT COUNT(*) as cnt FROM recorded_courses_sql WHERE json_extract(data_json, '$.isPublished') = 1 AND json_extract(data_json, '$.createdAt') >= ? AND json_extract(data_json, '$.createdAt') <= ?`,
        [startISO, endISO]
      );
      const newWorkshops = Number((coursesRes.rows[0] as any)?.cnt ?? 0);

      // New enrollments in period
      const enrollRes = await safeExecute(
        `SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?`,
        [startISO, endISO]
      );
      const newEnrollments = Number((enrollRes.rows[0] as any)?.cnt ?? 0);

      // Active users in period
      const activeRes = await safeExecute(
        `SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE json_extract(data_json, '$.status') = 'active' AND json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?`,
        [startISO, endISO]
      );
      const activeUsers = Number((activeRes.rows[0] as any)?.cnt ?? 0);

      // Payments received in period
      const payRes = await safeExecute(
        `SELECT data_json FROM course_enrollments_sql WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ? AND (json_extract(data_json, '$.purchaseType') IS NULL OR json_extract(data_json, '$.purchaseType') != 'gift')`,
        [startISO, endISO]
      );
      const paymentsReceived = (payRes.rows as any[]).reduce((sum, row) => {
        try {
          const e = JSON.parse(String(row.data_json || '{}'));
          return sum + (typeof e.amountPaid === 'number' ? e.amountPaid : 0);
        } catch { return sum; }
      }, 0);

      // Enrollment trend — group by date
      const trendRes = await safeExecute(
        `SELECT substr(json_extract(data_json, '$.enrolledAt'), 1, ${format === 'yearly' ? '7' : '10'}) as day, COUNT(*) as cnt
         FROM course_enrollments_sql
         WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?
         GROUP BY day ORDER BY day ASC`,
        [startISO, endISO]
      );
      const enrollmentsTrend = (trendRes.rows as any[]).map(r => ({
        date: formatDate(r.day, format),
        count: Number(r.cnt),
      }));

      // Revenue trend — group by date
      const revTrendRes = await safeExecute(
        `SELECT substr(json_extract(data_json, '$.enrolledAt'), 1, ${format === 'yearly' ? '7' : '10'}) as day,
                SUM(CAST(json_extract(data_json, '$.amountPaid') AS REAL)) as amount
         FROM course_enrollments_sql
         WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?
           AND (json_extract(data_json, '$.purchaseType') IS NULL OR json_extract(data_json, '$.purchaseType') != 'gift')
         GROUP BY day ORDER BY day ASC`,
        [startISO, endISO]
      );
      const revenueTrend = (revTrendRes.rows as any[]).map(r => ({
        date: formatDate(r.day, format),
        amount: Math.round(Number(r.amount) || 0),
      }));

      // Progress distribution
      const progRes = await safeExecute(
        `SELECT data_json FROM course_enrollments_sql WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?`,
        [startISO, endISO]
      );
      const progBuckets = [0, 0, 0, 0];
      (progRes.rows as any[]).forEach(row => {
        try {
          const e = JSON.parse(String(row.data_json || '{}'));
          const p = Number(e.progress || 0);
          if (p < 25) progBuckets[0]++;
          else if (p < 50) progBuckets[1]++;
          else if (p < 75) progBuckets[2]++;
          else progBuckets[3]++;
        } catch {}
      });
      const progressDistribution = ['0-25%', '25-50%', '50-75%', '75-100%'].map((range, i) => ({
        range,
        count: progBuckets[i],
      }));

      // Top courses by enrollment count
      const topRes = await safeExecute(
        `SELECT json_extract(data_json, '$.courseId') as cid,
                json_extract(data_json, '$.courseName') as cname,
                COUNT(*) as cnt,
                SUM(CAST(json_extract(data_json, '$.amountPaid') AS REAL)) as rev
         FROM course_enrollments_sql
         WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?
           AND (json_extract(data_json, '$.purchaseType') IS NULL OR json_extract(data_json, '$.purchaseType') != 'gift')
         GROUP BY cid ORDER BY cnt DESC LIMIT 10`,
        [startISO, endISO]
      );
      const topCourses = (topRes.rows as any[]).map(r => ({
        title: r.cname || r.cid || 'Unknown',
        enrollments: Number(r.cnt),
        revenue: Math.round(Number(r.rev) || 0),
      }));

      // Recent enrollments
      const recentRes = await safeExecute(
        `SELECT data_json FROM course_enrollments_sql
         WHERE json_extract(data_json, '$.enrolledAt') >= ? AND json_extract(data_json, '$.enrolledAt') <= ?
         ORDER BY json_extract(data_json, '$.enrolledAt') DESC LIMIT 10`,
        [startISO, endISO]
      );
      const recentEnrollments = (recentRes.rows as any[]).map(row => {
        try {
          const e = JSON.parse(String(row.data_json || '{}'));
          return {
            userName: e.userName || e.userId || 'Unknown',
            userEmail: e.userEmail || '',
            courseName: e.courseName || e.courseId || 'Unknown',
            enrolledAt: e.enrolledAt,
          };
        } catch { return {}; }
      });

      return NextResponse.json({
        success: true,
        stats: {
          newWorkshops,
          newEnrollments,
          paymentsReceived: Math.round(paymentsReceived),
          activeUsers,
          enrollmentsTrend,
          revenueTrend,
          progressDistribution,
          topCourses,
          recentEnrollments,
        },
      });
    }

    // ── Overall stats (no filter) ──
    if (!courseId && !userId) {
      const totalRes = await safeExecute(`SELECT COUNT(*) as cnt FROM course_enrollments_sql`);
      const activeRes = await safeExecute(`SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE json_extract(data_json, '$.status') = 'active'`);
      const completedRes = await safeExecute(`SELECT COUNT(*) as cnt FROM course_enrollments_sql WHERE json_extract(data_json, '$.status') = 'completed'`);
      const coursesRes = await safeExecute(`SELECT COUNT(*) as cnt FROM recorded_courses_sql WHERE json_extract(data_json, '$.isPublished') = 1`);

      const totalEnrollments = Number((totalRes.rows[0] as any)?.cnt ?? 0);
      const activeEnrollments = Number((activeRes.rows[0] as any)?.cnt ?? 0);
      const completedEnrollments = Number((completedRes.rows[0] as any)?.cnt ?? 0);
      const totalCourses = Number((coursesRes.rows[0] as any)?.cnt ?? 0);

      const avgProgRes = await safeExecute(
        `SELECT AVG(CAST(json_extract(data_json, '$.progress') AS REAL)) as avgprog,
                SUM(CAST(json_extract(data_json, '$.totalWatchTime') AS REAL)) as totalwatch
         FROM course_enrollments_sql`
      );
      const avgProgress = Number((avgProgRes.rows[0] as any)?.avgprog ?? 0);
      const totalWatchTime = Number((avgProgRes.rows[0] as any)?.totalwatch ?? 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalCourses,
          avgProgress: Math.round(avgProgress),
          totalWatchTime,
          totalWatchSessions: totalEnrollments,
        },
      });
    }

    // ── Course specific stats ──
    if (courseId) {
      const enrollRes = await safeExecute(
        `SELECT data_json FROM course_enrollments_sql WHERE json_extract(data_json, '$.courseId') = ?`,
        [courseId]
      );
      const enrollments = (enrollRes.rows as any[]).map(r => {
        try { return JSON.parse(String(r.data_json || '{}')); } catch { return {}; }
      });

      const totalEnrolled = enrollments.length;
      const completed = enrollments.filter(e => e.status === 'completed').length;
      const active = enrollments.filter(e => e.status === 'active').length;
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + (Number(e.progress) || 0), 0) / enrollments.length)
        : 0;
      const totalWatchTime = enrollments.reduce((s, e) => s + (Number(e.totalWatchTime) || 0), 0);

      return NextResponse.json({
        success: true,
        course: { title: courseId },
        stats: {
          totalEnrolled,
          completed,
          active,
          completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0,
          avgProgress,
          totalWatchTime,
          enrollmentDetails: enrollments.map(e => ({
            userId: e.userId,
            userName: e.userName,
            userEmail: e.userEmail,
            progress: e.progress,
            status: e.status,
            watchTime: e.totalWatchTime,
            enrolledAt: e.enrolledAt,
          })),
        },
      });
    }

    // ── User specific stats ──
    if (userId) {
      const enrollRes = await safeExecute(
        `SELECT data_json FROM course_enrollments_sql WHERE json_extract(data_json, '$.userId') = ?`,
        [userId]
      );
      const enrollments = (enrollRes.rows as any[]).map(r => {
        try { return JSON.parse(String(r.data_json || '{}')); } catch { return {}; }
      });

      const totalWatchTime = enrollments.reduce((s, e) => s + (Number(e.totalWatchTime) || 0), 0);
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + (Number(e.progress) || 0), 0) / enrollments.length)
        : 0;

      return NextResponse.json({
        success: true,
        stats: {
          totalCourses: enrollments.length,
          totalWatchTime,
          avgProgress,
          completedCourses: enrollments.filter(e => e.status === 'completed').length,
          enrollments: enrollments.map(e => ({
            courseId: e.courseId,
            courseName: e.courseName,
            courseSlug: e.courseSlug,
            progress: e.progress,
            status: e.status,
            watchTime: e.totalWatchTime,
            enrolledAt: e.enrolledAt,
            certificateIssued: e.certificateIssued,
          })),
        },
      });
    }

    return NextResponse.json({ success: true, stats: {} });

  } catch (error: any) {
    console.error('[E-Learning Analytics GET Error]:', error);
    return NextResponse.json({ error: 'Server error', detail: String(error?.message || '') }, { status: 500 });
  }
}
