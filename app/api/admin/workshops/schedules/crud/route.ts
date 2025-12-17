import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSchedule } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { makeWorkshopScheduleId } from '@/lib/workshopScheduleIds';

export const dynamic = 'force-dynamic';

const toDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value) return undefined;
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

    const nextUpdates: Record<string, any> = { ...updates };
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'startDate')) {
      nextUpdates.startDate = toDateOrUndefined(nextUpdates.startDate);
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'endDate')) {
      nextUpdates.endDate = toDateOrUndefined(nextUpdates.endDate);
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'registrationCloseDate')) {
      nextUpdates.registrationCloseDate = toDateOrUndefined(nextUpdates.registrationCloseDate);
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'registration_close_date')) {
      nextUpdates.registrationCloseDate = toDateOrUndefined(nextUpdates.registration_close_date);
      delete nextUpdates.registration_close_date;
    }

    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'slots') && !Object.prototype.hasOwnProperty.call(nextUpdates, 'seatsTotal')) {
      nextUpdates.seatsTotal = Number(nextUpdates.slots);
      delete nextUpdates.slots;
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
