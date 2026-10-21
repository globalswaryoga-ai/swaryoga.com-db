import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { listWorkshopSchedules } from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized - admin token required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workshopSlug = (searchParams.get('workshopSlug') || searchParams.get('workshopId') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    const status = (searchParams.get('status') || '').trim().toLowerCase();

    const schedules = await listWorkshopSchedules({
      workshopSlug: workshopSlug || undefined,
      mode: mode || undefined,
      status: status === 'draft' || status === 'published' ? status : undefined,
    });

    return NextResponse.json(
      { success: true, data: schedules },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err) {
    console.error('[GET /api/admin/workshops/schedules]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

