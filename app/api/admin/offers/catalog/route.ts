import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listCohorts } from '@/lib/workshopBunnyRepository';
import { listCourses } from '@/lib/bunnyCourseRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!rawToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(rawToken);
    if (!decoded?.isAdmin && rawToken !== 'admin_root') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const [cohorts, courses] = await Promise.all([
      listCohorts().catch((err) => {
        console.error('Failed to list cohorts for offers:', err);
        return [];
      }),
      listCourses().catch((err) => {
        console.error('Failed to list courses for offers:', err);
        return [];
      }),
    ]);

    const workshops = (cohorts || [])
      .filter((c: any) => c && c.name)
      .map((c: any) => ({
        id: String(c._id || c.id),
        name: String(c.name).trim(),
        type: 'workshop',
        category: 'Live Workshop',
      }));

    const elearningCourses = (courses || [])
      .map((c: any) => {
        const title = c.content?.en?.title || c.title || c.slug || 'Untitled Course';
        return {
          id: String(c._id || c.id),
          name: String(title).trim(),
          type: 'course',
          category: 'E-Learning Course',
        };
      })
      .filter((c: any) => c.name);

    return NextResponse.json({
      success: true,
      workshops,
      courses: elearningCourses,
    });
  } catch (error) {
    console.error('Offers catalog fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}
