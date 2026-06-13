import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastRecurringSchedule, Lead, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
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
 * Create a recurring (repeat) Meta broadcast schedule.
 *
 * Body:
 * {
 *   name?: string
 *   templateId: string
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
    const finalLeadIds = ownedLeads.map((l: any) => toObjectId(String(l._id)));
    if (finalLeadIds.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Build occurrences — scheduledAt = date + sendTime in IST (UTC+05:30)
    const occurrences = occurrenceDates.map((dateStr, index) => {
      const scheduledAt = new Date(`${dateStr}T${sendTime}:00+05:30`);
      return {
        index,
        scheduledAt,
        status: 'pending' as const,
      };
    }).filter(o => !Number.isNaN(o.scheduledAt.getTime()));

    if (occurrences.length === 0) {
      return NextResponse.json({ error: 'No valid occurrence dates' }, { status: 400 });
    }

    const schedule = await BroadcastRecurringSchedule.create({
      name,
      createdByUserId: viewerUserId,
      templateId: toObjectId(templateId),
      provider,
      leadIds: finalLeadIds,
      sendTime,
      deliveredOnly: true,
      overrideImageUrl: overrideImageUrl || undefined,
      occurrences,
      status: 'active',
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
    const viewerUserId = getViewerUserId(decoded);

    const filter: any = {};
    if (!superAdmin) filter.createdByUserId = viewerUserId;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    if (status) filter.status = String(status);

    const schedules = await BroadcastRecurringSchedule.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({ path: 'templateId', select: 'templateName' })
      .lean();

    return NextResponse.json({ success: true, data: { schedules } }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-recurring');
  }
}
