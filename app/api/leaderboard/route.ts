/**
 * Leaderboard API
 * GET /api/leaderboard - Get leaderboard rankings
 * Connected to Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCourseSchema } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await initCourseSchema();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: TokenPayload | null;
    try {
      decoded = verifyToken(authHeader.split(' ')[1]);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const currentUserId = decoded.id || decoded._id || decoded.userId;
    const courseFilter = request.nextUrl.searchParams.get('course') || 'all';

    let sql = `
      SELECT 
        e.user_id,
        COALESCE(u.name, 'Student') as student_name,
        SUM(e.progress_percent) as total_points,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) as courses_completed
      FROM course_enrollments_sql e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.status IN ('active', 'completed')
    `;
    const args: any[] = [];

    if (courseFilter !== 'all') {
      sql += ' AND e.course_id = ?';
      args.push(courseFilter);
    }

    sql += `
      GROUP BY e.user_id
      ORDER BY total_points DESC
      LIMIT 100
    `;

    const res = await bunnyExecute({ sql, args }).catch(() => ({ rows: [] }));

    const leaderboard = res.rows.map((entry: any, idx: number) => ({
      rank: idx + 1,
      userId: String(entry.user_id || ''),
      studentName: entry.student_name || 'Anonymous',
      totalWatchTime: 0,
      coursesCompleted: Number(entry.courses_completed || 0),
      totalPoints: Math.round(Number(entry.total_points || 0)),
      badges: [],
      isCurrentUser: String(entry.user_id) === String(currentUserId),
    }));

    return NextResponse.json({
      success: true,
      data: leaderboard,
    });

  } catch (error: any) {
    console.error('[Leaderboard Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
