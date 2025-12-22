import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSchedule } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { makeWorkshopScheduleId } from '@/lib/workshopScheduleIds';

export const dynamic = 'force-dynamic';

const toDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const normalizeMode = (value: unknown) => String(value || '').trim().toLowerCase();
const normalizeSlug = (value: unknown) => String(value || '').trim();

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const workshopSlug = normalizeSlug(body.workshopSlug || body.workshop_id);
    const mode = normalizeMode(body.mode);

    if (!workshopSlug || !mode) {
      return NextResponse.json({ error: 'workshopSlug and mode are required' }, { status: 400 });
    }

    const currency = String(body.currency || 'INR').toUpperCase();
    const batch = String(body.batch || 'morning').toLowerCase();

    const id = String(
      body.id ||
        body._id ||
        makeWorkshopScheduleId({
          workshopSlug,
          mode,
          batch,
          startDate: body.startDate,
          currency,
          startTime: body.startTime,
        })
    );

    await connectDB();

    const doc = await WorkshopSchedule.create({
      _id: id,
      workshopSlug,
      workshopName: String(body.workshopName || body.workshop_name || ''),
      mode,
      language: String(body.language || 'Hindi'),
      batch,
      startDate: toDateOrUndefined(body.startDate),
      endDate: toDateOrUndefined(body.endDate),
      days: String(body.days || ''),
      time: String(body.time || ''),
      startTime: String(body.startTime || ''),
      endTime: String(body.endTime || ''),
      seatsTotal: Number.isFinite(Number(body.seatsTotal)) ? Number(body.seatsTotal) : Number(body.slots) || 60,
      registrationCloseDate: toDateOrUndefined(body.registrationCloseDate || body.registration_close_date),
      location: String(body.location || ''),
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      currency,
      status: body.status === 'published' ? 'published' : 'draft',
      publishedAt: body.status === 'published' ? new Date() : undefined,
    });

    const docObj = doc.toObject();
    console.log('[POST] Created schedule:', {
      id: String(doc._id),
      workshopName: docObj.workshopName,
      language: docObj.language,
      mode: docObj.mode,
      allKeys: Object.keys(docObj),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(doc._id),
          ...doc.toObject(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/admin/workshops/schedules/crud]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    await connectDB();

    const nextUpdates: Record<string, any> = {};
    
    // Only include fields that are explicitly provided in the request
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'startDate') {
        nextUpdates.startDate = toDateOrUndefined(value);
      } else if (key === 'endDate') {
        nextUpdates.endDate = toDateOrUndefined(value);
      } else if (key === 'registrationCloseDate') {
        nextUpdates.registrationCloseDate = toDateOrUndefined(value);
      } else if (key === 'registration_close_date') {
        nextUpdates.registrationCloseDate = toDateOrUndefined(value);
      } else if (key === 'slots') {
        nextUpdates.seatsTotal = Number(value);
      } else {
        nextUpdates[key] = value;
      }
    }

    if (typeof nextUpdates.status === 'string') {
      const status = String(nextUpdates.status).toLowerCase();
      if (status === 'published') {
        nextUpdates.status = 'published';
        nextUpdates.publishedAt = new Date();
      } else if (status === 'draft') {
        nextUpdates.status = 'draft';
        nextUpdates.publishedAt = undefined;
      }
    }

    const updated = await WorkshopSchedule.findByIdAndUpdate(String(id), { $set: nextUpdates }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: String(updated._id), ...updated.toObject() } });
  } catch (err) {
    console.error('[PUT /api/admin/workshops/schedules/crud]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
    }

    await connectDB();

    const res = await WorkshopSchedule.deleteOne({ _id: String(id) });
    if (!res.deletedCount) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/workshops/schedules/crud]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
