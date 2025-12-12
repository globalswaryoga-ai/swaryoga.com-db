// Public API endpoint to get workshop schedules
import { NextRequest, NextResponse } from 'next/server';
import { getSchedules } from '@/lib/workshopDatabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopId = searchParams.get('workshopId');
    const mode = searchParams.get('mode');
    const baseUrl = new URL(request.url).origin;

    const { data, error } = await getSchedules(workshopId || undefined, baseUrl);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    let schedules = data || [];

    // Filter by mode if provided
    if (mode) {
      schedules = schedules.filter(s => s.mode === mode);
    }

    return NextResponse.json({ data: schedules });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
