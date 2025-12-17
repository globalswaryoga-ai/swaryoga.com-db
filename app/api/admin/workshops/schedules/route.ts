import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSchedule } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workshopSlug = (searchParams.get('workshopSlug') || searchParams.get('workshopId') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    const status = (searchParams.get('status') || '').trim().toLowerCase();

    await connectDB();

    const query: Record<string, any> = {};
    if (workshopSlug) query.workshopSlug = workshopSlug;
    if (mode) query.mode = mode;
    if (status === 'draft' || status === 'published') query.status = status;

    const docs = await WorkshopSchedule.find(query)
      .sort({ workshopSlug: 1, startDate: 1 })
      .lean();

    const schedules = (docs as any[]).map((doc) => {
      const { _id, ...rest } = doc;
      return {
        id: String(_id),
        ...rest,
      };
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
