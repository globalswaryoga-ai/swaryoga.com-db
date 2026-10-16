import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listWorkshopSchedules } from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Workshop schedules are main website data - superadmin only
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
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

    console.log('[GET /api/admin/workshops/schedules] Found:', schedules.length);

    return NextResponse.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[GET /api/admin/workshops/schedules]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
