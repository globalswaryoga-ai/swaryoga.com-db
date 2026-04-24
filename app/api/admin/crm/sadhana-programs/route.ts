import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsCollection, slugify } from '@/lib/sadhanaPrograms';

export async function GET() {
  try {
    const col = await getProgramsCollection();
    const programs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({
      success: true,
      programs: programs.map((p: any) => ({
        id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        description: p.description,
        timeSlots: p.timeSlots || (p.scheduleTime ? [p.scheduleTime] : []),
        timezone: p.timezone,
        videoDuration: p.videoDuration,
        countdownMinutes: p.countdownMinutes,
        active: p.active,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-programs');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, timeSlots, timezone, videoDuration, countdownMinutes } = body;

    if (!name || !timeSlots || timeSlots.length === 0) {
      return NextResponse.json({ error: 'name and timeSlots required' }, { status: 400 });
    }

    const col = await getProgramsCollection();
    let slug = slugify(name);
    let slugCheck = await col.findOne({ slug });
    let suffix = 1;
    while (slugCheck) {
      slug = `${slugify(name)}-${suffix++}`;
      slugCheck = await col.findOne({ slug });
    }

    const now = new Date();
    const doc = {
      slug,
      name: String(name).slice(0, 100),
      description: description ? String(description).slice(0, 500) : '',
      timeSlots: Array.isArray(timeSlots) ? timeSlots.slice(0, 4) : [timeSlots],
      timezone: timezone || 'Asia/Kolkata',
      videoDuration: parseInt(videoDuration) || 40,
      countdownMinutes: parseInt(countdownMinutes) || 3,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);
    return NextResponse.json({
      success: true,
      program: { id: result.insertedId.toString(), ...doc },
    });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-programs');
  }
}
