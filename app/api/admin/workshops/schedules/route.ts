// GET all schedules or GET schedule by workshop ID
import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/workshopDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopId = searchParams.get('workshopId');
    const origin = new URL(request.url).origin;

    const { data, error } = await getSchedules(workshopId || undefined, origin);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
