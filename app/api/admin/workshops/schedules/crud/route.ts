import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { makeWorkshopScheduleId } from '@/lib/workshopScheduleIds';
import {
  saveWorkshopSchedule,
  updateWorkshopSchedule,
  deleteWorkshopSchedule,
  getWorkshopSchedule,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

const toDateOrUndefined = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const normalizeMode = (value: unknown) => String(value || '').trim().toLowerCase();
const normalizeSlug = (value: unknown) => String(value || '').trim();

const normalizeLanguage = (value: unknown) => {
  const k = String(value ?? '').trim().toLowerCase();
  if (k === 'hindi') return 'Hindi';
  if (k === 'english') return 'English';
  if (k === 'marathi') return 'Marathi';
  if (k === 'kannada') return 'Kannada';
  return String(value || 'Hindi');
};

const normalizeBatch = (value: unknown) => {
  const k = String(value ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (k === 'early-morning') return 'early-morning';
  if (k === 'morning') return 'morning';
  if (k === 'afternoon') return 'afternoon';
  if (k === 'evening') return 'evening';
  if (k === 'late-night' || k === 'latenight') return 'late-night';
  if (k === 'earlymorning') return 'early-morning';
  if (k === 'full-day' || k === 'fullday') return 'full-day';
  return k || 'morning';
};

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized - invalid or missing admin token' }, { status: 401 });
    }

    const body = await request.json().catch((e) => {
      throw new Error(`Failed to parse request body: ${e.message}`);
    });

    const workshopSlug = normalizeSlug(body.workshopSlug || body.workshop_id);
    const mode = normalizeMode(body.mode);

    if (!workshopSlug || !mode) {
      return NextResponse.json(
        { error: `workshopSlug and mode are required. Got: slugs="${workshopSlug}", mode="${mode}"` },
        { status: 400 }
      );
    }

    const currency = String(body.currency || 'INR').toUpperCase();
    const batch = normalizeBatch(body.batch || 'morning');

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

    const seatsTotal = Number.isFinite(Number(body.seatsTotal))
      ? Number(body.seatsTotal)
      : Number(body.slots) || 60;

    const schedule = await saveWorkshopSchedule({
      id,
      workshopSlug,
      workshopName: String(body.workshopName || body.workshop_name || ''),
      mode,
      language: normalizeLanguage(body.language || 'Hindi'),
      batch,
      startDate: toDateOrUndefined(body.startDate),
      endDate: toDateOrUndefined(body.endDate),
      days: String(body.days || ''),
      time: String(body.time || ''),
      startTime: String(body.startTime || ''),
      endTime: String(body.endTime || ''),
      seatsTotal,
      seatsRemaining: seatsTotal,
      registrationCloseDate: toDateOrUndefined(body.registrationCloseDate || body.registration_close_date),
      location: String(body.location || ''),
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      price3Month: Number.isFinite(Number(body.price3Month)) ? Number(body.price3Month) : 0,
      priceNPR: Number.isFinite(Number(body.priceNPR)) ? Number(body.priceNPR) : 0,
      nepalQrCode: String(body.nepalQrCode || ''),
      currency,
      status: body.status === 'published' ? 'published' : 'draft',
      publishedAt: body.status === 'published' ? new Date().toISOString() : undefined,
      metadata: {
        ...(body.metadata || {}),
        pricingType: body.pricingType ? String(body.pricingType) : undefined,
        allowPartPayment: body.allowPartPayment !== undefined ? Boolean(body.allowPartPayment) : undefined,
        partPaymentMinAmount: Number.isFinite(Number(body.partPaymentMinAmount)) ? Number(body.partPaymentMinAmount) : undefined,
      },
    });

    console.log('[POST /api/admin/workshops/schedules/crud] Created schedule in BunnyDB:', schedule.id);

    return NextResponse.json(
      {
        success: true,
        data: schedule,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/admin/workshops/schedules/crud] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized - invalid or missing admin token' }, { status: 401 });
    }

    const body = await request.json().catch((e) => {
      throw new Error(`Failed to parse request body: ${e.message}`);
    });
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    const nextUpdates: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'startDate' || key === 'endDate' || key === 'registrationCloseDate' || key === 'registration_close_date') {
        nextUpdates[key === 'registration_close_date' ? 'registrationCloseDate' : key] = toDateOrUndefined(value);
      } else if (key === 'slots') {
        nextUpdates.seatsTotal = Number(value);
      } else if (key === 'language') {
        nextUpdates.language = normalizeLanguage(value);
      } else if (key === 'batch') {
        nextUpdates.batch = normalizeBatch(value);
      } else if (key === 'price' || key === 'price3Month' || key === 'priceNPR') {
        const numValue = Number(value);
        if (Number.isFinite(numValue)) {
          nextUpdates[key] = numValue;
        }
      } else if (key === 'nepalQrCode') {
        nextUpdates.nepalQrCode = String(value || '');
      } else {
        nextUpdates[key] = value;
      }
    }

    if (typeof nextUpdates.status === 'string') {
      const status = String(nextUpdates.status).toLowerCase();
      if (status === 'published') {
        nextUpdates.status = 'published';
        nextUpdates.publishedAt = new Date().toISOString();
      } else if (status === 'draft') {
        nextUpdates.status = 'draft';
        nextUpdates.publishedAt = null;
      }
    }

    if (
      body.pricingType !== undefined ||
      body.allowPartPayment !== undefined ||
      body.partPaymentMinAmount !== undefined ||
      body.metadata !== undefined
    ) {
      const existing = await getWorkshopSchedule(String(id));
      const currentMeta = existing?.metadata || {};
      nextUpdates.metadata = {
        ...currentMeta,
        ...(body.metadata || {}),
        pricingType: body.pricingType !== undefined ? String(body.pricingType) : currentMeta.pricingType,
        allowPartPayment:
          body.allowPartPayment !== undefined ? Boolean(body.allowPartPayment) : currentMeta.allowPartPayment,
        partPaymentMinAmount:
          body.partPaymentMinAmount !== undefined
            ? Number.isFinite(Number(body.partPaymentMinAmount))
              ? Number(body.partPaymentMinAmount)
              : undefined
            : currentMeta.partPaymentMinAmount,
      };
    }

    console.log('[PUT /api/admin/workshops/schedules/crud] Updating schedule in BunnyDB:', id, nextUpdates);

    const updated = await updateWorkshopSchedule(String(id), nextUpdates);
    if (!updated) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PUT /api/admin/workshops/schedules/crud] Error:', err);
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

    const deleted = await deleteWorkshopSchedule(String(id));
    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    console.log('[DELETE /api/admin/workshops/schedules/crud] Deleted schedule from BunnyDB:', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/workshops/schedules/crud] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
