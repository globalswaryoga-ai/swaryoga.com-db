import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Workshop, WorkshopSchedule } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { makeWorkshopScheduleId } from '@/lib/workshopScheduleIds';
import { workshopCatalog, workshopDetails } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // 1) Upsert workshop metadata
    await Promise.all(
      workshopCatalog.map(async (w) => {
        await Workshop.updateOne(
          { slug: w.slug },
          {
            $set: {
              slug: w.slug,
              name: w.name,
              category: w.category,
              image: w.image,
              description: w.description,
              duration: w.duration,
              level: w.level,
              routePath: `/workshops/${w.slug}`,
              modes: w.mode || [],
              languages: w.language || [],
              currencies: w.currency || [],
              isPublished: true,
            },
          },
          { upsert: true }
        );
      })
    );

    // 2) Upsert schedules from current static workshopDetails (as published)
    const upsertResults: Array<{ id: string; workshopSlug: string }> = [];

    for (const w of workshopCatalog) {
      const detail = workshopDetails[w.slug];
      const schedules = Array.isArray(detail?.schedules) ? detail.schedules : [];

      for (const s of schedules) {
        const id = makeWorkshopScheduleId({
          workshopSlug: w.slug,
          mode: s.mode,
          batch: s.mode === 'recorded' ? 'anytime' : 'morning',
          startDate: s.startDate,
          currency: s.currency,
        });

        await WorkshopSchedule.updateOne(
          { _id: id },
          {
            $set: {
              workshopSlug: w.slug,
              workshopName: w.name,
              mode: s.mode,
              batch: s.mode === 'recorded' ? 'anytime' : 'morning',
              startDate: s.startDate ? new Date(s.startDate) : undefined,
              endDate: s.endDate ? new Date(s.endDate) : undefined,
              time: s.time,
              seatsTotal: s.seats,
              location: s.location || '',
              price: s.price,
              currency: String(s.currency || 'INR').toUpperCase(),
              status: 'published',
              publishedAt: new Date(),
            },
          },
          { upsert: true }
        );

        upsertResults.push({ id, workshopSlug: w.slug });
      }
    }

    return NextResponse.json({ success: true, data: { workshops: workshopCatalog.length, schedules: upsertResults.length } });
  } catch (error) {
    console.error('Seed schedules error:', error);
    return NextResponse.json({ error: 'Failed to seed workshop schedules' }, { status: 500 });
  }
}
