import { NextResponse } from 'next/server';
import { listWorkshopSchedules } from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const schedules = await listWorkshopSchedules({ status: 'published' });

    // Group by workshopSlug
    const workshopMap: Record<string, any> = {};

    schedules.forEach((s) => {
      const slug = s.workshopSlug;
      if (!slug) return;

      if (!workshopMap[slug]) {
        workshopMap[slug] = {
          id: slug,
          name: s.workshopName || 'Untitled Workshop',
          schedules: [],
        };
      }

      // Format time
      let timeStr = s.time;
      if (!timeStr && s.startTime && s.endTime) {
        timeStr = `${s.startTime} - ${s.endTime}`;
      }

      workshopMap[slug].schedules.push({
        id: String(s.id),
        startDate: s.startDate,
        endDate: s.endDate,
        registrationCloseDate: s.registrationCloseDate || s.endDate,
        time: timeStr || '',
        mode: s.mode,
        language: s.language || 'Hindi',
        location: s.location || null,
        slots: s.seatsTotal || 20,
        duration: s.days || '',
        price: s.price || 0,
      });
    });

    const data = Object.values(workshopMap);

    return NextResponse.json({
      message: 'Workshops fetched successfully',
      data,
    });
  } catch (error) {
    console.error('Error fetching workshop list:', error);
    return NextResponse.json(
      { message: 'Error fetching workshops', error: String(error) },
      { status: 500 }
    );
  }
}
