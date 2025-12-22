import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSeatInventory } from '@/lib/db';

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

    await connectDB();

    // Upsert missing inventories (initialize from seatsTotal)
    await Promise.all(
      sanitized.map(async (r) => {
        await WorkshopSeatInventory.updateOne(
          { workshopSlug: r.workshopSlug, scheduleId: r.scheduleId },
          {
            $setOnInsert: {
              workshopSlug: r.workshopSlug,
              scheduleId: r.scheduleId,
              seatsTotal: r.seatsTotal,
              seatsRemaining: r.seatsTotal,
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
      })
    );

    const docs = await WorkshopSeatInventory.find({
      $or: sanitized.map((r) => ({ workshopSlug: r.workshopSlug, scheduleId: r.scheduleId })),
    })
      .select({ workshopSlug: 1, scheduleId: 1, seatsRemaining: 1 })
      .lean();

    const data: Record<string, number> = {};
    for (const doc of docs as any[]) {
      const key = `${String(doc.workshopSlug)}|${String(doc.scheduleId)}`;
      data[key] = Number(doc.seatsRemaining ?? 0);
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Failed to get workshop availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get workshop availability' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch all seat inventory records
    const inventory = await WorkshopSeatInventory.find({})
      .select({ workshopSlug: 1, scheduleId: 1, seatsTotal: 1, seatsRemaining: 1 })
      .lean();

    return NextResponse.json(
      { 
        success: true, 
        data: inventory || []
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
