import { NextResponse } from 'next/server';
import { connectDB, WorkshopSchedule } from '@/lib/db';

export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    await connectDB();

    // Fetch all published schedules from MongoDB
    const schedules = await WorkshopSchedule.find({ status: 'published' })
      .select({
        _id: 1,
        workshopSlug: 1,
        workshopName: 1,
        mode: 1,
        language: 1,
        batch: 1,
        startDate: 1,
        endDate: 1,
        time: 1,
        startTime: 1,
        endTime: 1,
        seatsTotal: 1,
        registrationCloseDate: 1,
        location: 1,
        price: 1,
        duration: 1,
        currency: 1
      })
      .lean();

    // Group by workshopSlug
    const workshopMap: Record<string, any> = {};

    schedules.forEach((s: any) => {
      const slug = s.workshopSlug;
      if (!slug) return;

      if (!workshopMap[slug]) {
        workshopMap[slug] = {
          id: slug,
          name: s.workshopName || 'Untitled Workshop', // Use DB name
          schedules: []
        };
      }

      // Format time
      let timeStr = s.time;
      if (!timeStr && s.startTime && s.endTime) {
        timeStr = `${s.startTime} - ${s.endTime}`;
      }

      workshopMap[slug].schedules.push({
        id: String(s._id),
        startDate: s.startDate,
        endDate: s.endDate,
        registrationCloseDate: s.registrationCloseDate || s.endDate,
        time: timeStr || '',
        mode: s.mode,
        language: s.language || 'Hindi',
        location: s.location || null,
        slots: s.seatsTotal || 20, // Default if missing
        duration: s.duration || '',
        price: s.price || 0
      });
    });

    const data = Object.values(workshopMap);

    return NextResponse.json({
      message: 'Workshops fetched successfully',
      data
    });
  } catch (error) {
    console.error('Error fetching workshop list:', error);
    return NextResponse.json(
      { message: 'Error fetching workshops', error: String(error) },
      { status: 500 }
    );
  }
}
