// Public API endpoint to get workshop schedules (published only)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSchedule } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workshopSlug = (searchParams.get('workshopSlug') || searchParams.get('workshopId') || '').trim();
    const mode = (searchParams.get('mode') || '').trim().toLowerCase();
    const language = (searchParams.get('language') || '').trim();

    await connectDB();

    const query: Record<string, any> = {
      status: 'published',
    };

    if (workshopSlug) {
      query.workshopSlug = workshopSlug;
    }

    if (mode) {
      query.mode = mode;
    }

    if (language) {
      query.language = language;
    }

    const docs = await WorkshopSchedule.find(query)
      .sort({ startDate: 1 })
      .select({
        _id: 1,
        workshopSlug: 1,
        workshopName: 1,
        mode: 1,
        language: 1,
        batch: 1,
        startDate: 1,
        endDate: 1,
        days: 1,
        time: 1,
        startTime: 1,
        endTime: 1,
        seatsTotal: 1,
        registrationCloseDate: 1,
        location: 1,
        price: 1,
        currency: 1,
        status: 1,
      })
      .lean();

    const schedules = (docs as any[]).map((doc) => ({
      id: String(doc._id),
      workshopSlug: String(doc.workshopSlug || ''),
      workshopName: String(doc.workshopName || ''),
      mode: doc.mode,
      language: doc.language,
      batch: doc.batch,
      startDate: doc.startDate,
      endDate: doc.endDate,
      days: doc.days,
      time: doc.time,
      startTime: doc.startTime,
      endTime: doc.endTime,
      seatsTotal: doc.seatsTotal,
      registrationCloseDate: doc.registrationCloseDate,
      location: doc.location,
      price: doc.price,
      currency: doc.currency,
      status: doc.status,
    }));

    return NextResponse.json({ success: true, data: schedules });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
