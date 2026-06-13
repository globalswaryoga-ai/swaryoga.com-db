import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { Lead, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import {
  createRecurringSchedule,
  listRecurringSchedules,
  findRecurringScheduleOwner,
  updateRecurringSchedule,
  deleteRecurringSchedule,
} from '@/lib/broadcastRecurring';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

/**
 * POST /api/admin/crm/broadcast-recurring
 * Create a recurring (repeat) broadcast schedule (Meta or QR).
 *
 * Body:
 * {
 *   name?: string
 *   templateId: string
 *   provider?: 'meta' | 'qr'   // default 'meta'
 *   leadIds: string[]
 *   occurrenceDates: string[]  // 'YYYY-MM-DD', IST calendar dates
 *   sendTime: string           // 'HH:mm', IST
 *   overrideImageUrl?: string
 * }
 *
 * Each occurrence after the first only sends to recipients whose previous
 * occurrence message status was 'delivered' or 'read' — handled by
 * processDueBroadcastRecurringSchedules (lib/broadcastRecurring.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const templateId = String(body?.templateId || '').trim();
    if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

    const occurrenceDates: string[] = Array.isArray(body?.occurrenceDates) ? body.occurrenceDates : [];
    if (occurrenceDates.length === 0) {
      return NextResponse.json({ error: 'occurrenceDates required' }, { status: 400 });
    }

    const sendTime = String(body?.sendTime || '').trim();
    if (!/^\d{2}:\d{2}$/.test(sendTime)) {
      return NextResponse.json({ error: 'sendTime required (HH:mm)' }, { status: 400 });
    }

    const rawLeadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds : [];
    if (rawLeadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds required' }, { status: 400 });
    }

    const overrideImageUrl = String(body?.overrideImageUrl || '').trim();
    const name = String(body?.name || '').trim() || `Repeat Broadcast ${new Date().toLocaleString()}`;

    const provider = String(body?.provider || 'meta').trim();
    if (!['meta', 'qr'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    await connectDB();

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || 'admin');

    // Verify template ownership — non-superadmins can only use their own templates
    const templateQuery: any = { _id: toObjectId(templateId) };
    if (!superAdmin) templateQuery.createdBy = viewerUserId;
    const template = await WhatsAppTemplate.findOne(templateQuery).lean();
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    // Resolve + verify ownership of leadIds (tenant isolation)
    const leadObjectIds = rawLeadIds.filter(Boolean).map((x) => toObjectId(String(x)));
    const leadQuery: any = { _id: { $in: leadObjectIds } };
    if (!superAdmin) {
      leadQuery.$or = [{ createdByUserId: viewerUserId }, { assignedToUserId: viewerUserId }];
    }
    const ownedLeads = await Lead.find(leadQuery).select({ _id: 1 }).lean();
    const finalLeadIds = ownedLeads.map((l: any) => String(l._id));
    if (finalLeadIds.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Build occurrences — scheduledAt = date + sendTime in IST (UTC+05:30)
    const occurrenceDateTimes = occurrenceDates
      .map((dateStr) => new Date(`${dateStr}T${sendTime}:00+05:30`))
      .filter((d) => !Number.isNaN(d.getTime()));

    if (occurrenceDateTimes.length === 0) {
      return NextResponse.json({ error: 'No valid occurrence dates' }, { status: 400 });
    }

    const schedule = await createRecurringSchedule({
      userId: viewerUserId,
      name,
      templateId,
      provider: provider as 'meta' | 'qr',
      leadIds: finalLeadIds,
      sendTime,
      occurrenceDates: occurrenceDateTimes,
      overrideImageUrl: overrideImageUrl || undefined,
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-recurring');
  }
}

/**
 * GET /api/admin/crm/broadcast-recurring
 * List recurring schedules — non-superadmins only see their own.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAdmin(request);
    await connectDB();

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = String(getViewerUserId(decoded) || '');

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    const provider = url.searchParams.get('provider') || undefined;

    let schedules = await listRecurringSchedules({
      userIds: superAdmin ? undefined : [viewerUserId],
      status,
    });

    if (provider) schedules = schedules.filter((s) => s.provider === provider);

    const templateIds = Array.from(new Set(schedules.map((s) => String(s.templateId))));
    const templates = await WhatsAppTemplate.find({ _id: { $in: templateIds.map(toObjectId) } })
      .select({ templateName: 1 })
      .lean();
    const templateNameById = new Map(templates.map((t: any) => [String(t._id), t.templateName]));

    const data = schedules.slice(0, 100).map((s) => ({
      ...s,
      templateId: { _id: s.templateId, templateName: templateNameById.get(String(s.templateId)) },
    }));

    return NextResponse.json({ success: true, data: { schedules: data } }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-recurring');
  }
}

/**
 * PATCH /api/admin/crm/broadcast-recurring
 * Edit a recurring schedule's name, send time, or active/paused status.
 *
 * Body: { scheduleId: string, name?: string, sendTime?: string (HH:mm), status?: 'active' | 'paused' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const scheduleId = String(body?.scheduleId || '').trim();
    if (!scheduleId || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      return NextResponse.json({ error: 'Invalid scheduleId' }, { status: 400 });
    }

    await connectDB();
    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || 'admin');

    const ownerUserId = await findRecurringScheduleOwner(scheduleId, superAdmin ? undefined : viewerUserId);
    if (!ownerUserId) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

    const updates: { name?: string; sendTime?: string; status?: 'active' | 'paused' } = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.sendTime === 'string' && /^\d{2}:\d{2}$/.test(body.sendTime)) updates.sendTime = body.sendTime;
    if (body.status === 'active' || body.status === 'paused') updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateRecurringSchedule(ownerUserId, scheduleId, updates);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'PATCH broadcast-recurring');
  }
}

/**
 * DELETE /api/admin/crm/broadcast-recurring?scheduleId=...
 * Permanently remove a recurring schedule.
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const url = new URL(request.url);
    const scheduleId = String(url.searchParams.get('scheduleId') || '').trim();
    if (!scheduleId || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      return NextResponse.json({ error: 'Invalid scheduleId' }, { status: 400 });
    }

    await connectDB();
    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || 'admin');

    const ownerUserId = await findRecurringScheduleOwner(scheduleId, superAdmin ? undefined : viewerUserId);
    if (!ownerUserId) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

    await deleteRecurringSchedule(ownerUserId, scheduleId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'DELETE broadcast-recurring');
  }
}
