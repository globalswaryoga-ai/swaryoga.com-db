import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkshopAvailabilityMap,
  getAllWorkshopSeatInventory,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

interface AvailabilityRequestItem {
  workshopSlug: string;
  scheduleId: string;
  seatsTotal: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { requests?: AvailabilityRequestItem[] }
      | null;

    const requests = Array.isArray(body?.requests) ? body!.requests : [];

    if (requests.length === 0) {
      return NextResponse.json({ success: true, data: {} }, { status: 200 });
    }

    const sanitized = requests
      .map((r) => ({
        workshopSlug: String(r.workshopSlug || '').trim(),
        scheduleId: String(r.scheduleId || '').trim(),
        seatsTotal: Number(r.seatsTotal),
      }))
      .filter(
        (r) =>
          r.workshopSlug &&
          r.scheduleId &&
          Number.isFinite(r.seatsTotal) &&
          r.seatsTotal > 0
      );

    if (sanitized.length === 0) {
      return NextResponse.json({ success: true, data: {} }, { status: 200 });
    }

    const data = await getWorkshopAvailabilityMap(sanitized);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Failed to get workshop availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get workshop availability' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const inventory = await getAllWorkshopSeatInventory();

    return NextResponse.json(
      {
        success: true,
        data: inventory || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch seat inventory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch seat inventory' },
      { status: 500 }
    );
  }
}
