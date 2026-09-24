import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrStatusSchedule } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * Per-tenant scheduled WhatsApp status posts.
 *
 * GET    → this tenant's schedules
 * POST   → create one (one-off, or repeating on given weekdays)
 * DELETE → cancel one (?id=)
 *
 * The cron at /api/cron/qr-status-scheduler does the posting, so a scheduled
 * status fires whether or not anyone has the CRM open.
 */

function authUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const schedules = await getQrStatusSchedule()
      .find({ userId })
      .sort({ scheduledAt: 1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, schedules });
  } catch (error: any) {
    console.error('[QR Status Schedule] GET error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to load schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, imageUrl, scheduledAt, repeatDays } = await request.json();

    if (!String(text || '').trim() && !String(imageUrl || '').trim()) {
      return NextResponse.json({ error: 'Status text or an image URL is required' }, { status: 400 });
    }

    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: 'A valid scheduled time is required' }, { status: 400 });
    }

    const days = Array.isArray(repeatDays)
      ? [...new Set(repeatDays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
      : [];

    // A one-off in the past would fire immediately on the next cron tick,
    // which is almost never what was meant. Repeating posts are exempt: their
    // time-of-day is what matters and the cron rolls them forward.
    if (!days.length && when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'That time is in the past' }, { status: 400 });
    }

    await connectDB();
    const created = await getQrStatusSchedule().create({
      userId,
      text: String(text || ''),
      imageUrl: String(imageUrl || ''),
      scheduledAt: when,
      repeatDays: days,
      active: true,
    });

    return NextResponse.json({ success: true, schedule: created });
  } catch (error: any) {
    console.error('[QR Status Schedule] POST error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to schedule status' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = authUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await connectDB();
    // Scoped by userId as well as _id so one tenant cannot cancel another's.
    const res = await getQrStatusSchedule().deleteOne({ _id: id, userId });
    if (!res.deletedCount) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[QR Status Schedule] DELETE error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to cancel schedule' }, { status: 500 });
  }
}
