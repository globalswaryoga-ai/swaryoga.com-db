import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastListMember, BroadcastRun, BroadcastRunMessage, Lead, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
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

async function resolveLeadIdsFromTarget(target: any): Promise<mongoose.Types.ObjectId[]> {
  // Back-compat: some clients send { target: { leadIds: [...] } } without a `type`.
  // Prefer explicit leadIds when present.
  if (Array.isArray(target?.leadIds) && target.leadIds.length) {
    const ids: any[] = target.leadIds;
    return ids.filter(Boolean).map((x) => toObjectId(String(x)));
  }

  const type = String(target?.type || 'filters');

  if (type === 'broadcastList') {
    const listId = String(target?.broadcastListId || '').trim();
    if (!listId) return [];

    const members = await BroadcastListMember.find({ listId: toObjectId(listId) }).select({ leadId: 1 }).lean();
    return members.map((m: any) => toObjectId(String(m.leadId)));
  }

  // filters
  const filters = target?.filters || {};
  const q: any = {};
  if (filters.status) q.status = String(filters.status);
  if (filters.workshopName) q.workshopName = String(filters.workshopName);
  if (filters.assignedToUserId) q.assignedToUserId = String(filters.assignedToUserId);
  if (filters.label) q.labels = { $in: [String(filters.label)] };

  const leads = await Lead.find(q).select({ _id: 1 }).lean();
  return leads.map((l: any) => toObjectId(String(l._id)));
}

/**
 * POST /api/admin/crm/broadcast-runs
 * Create a run: filters + template + mode.
 *
 * Body:
 * {
 *   name?: string
 *   templateId: string
 *   mode: 'now'|'schedule'|'delay'
 *   scheduleAt?: string (ISO)
 *   delayMins?: number
 *   target: {
 *     type: 'filters'|'leadIds'|'broadcastList'
 *     filters?: { status?, workshopName?, assignedToUserId?, label? }
 *     leadIds?: string[]
 *     broadcastListId?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const templateId = String(body?.templateId || '').trim();
    if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

    const mode = String(body?.mode || 'now');
    const allowed = new Set(['now', 'schedule', 'delay']);
    if (!allowed.has(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    const name = String(body?.name || '').trim() || `Broadcast ${new Date().toLocaleString()}`;

    let scheduledAt: Date | undefined;
    if (mode === 'schedule') {
      const s = String(body?.scheduleAt || '').trim();
      if (!s) return NextResponse.json({ error: 'scheduleAt required for schedule mode' }, { status: 400 });
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid scheduleAt' }, { status: 400 });
      scheduledAt = d;
    }
    if (mode === 'delay') {
      const mins = Number(body?.delayMins ?? 0);
      const qty = Number.isFinite(mins) && mins > 0 ? mins : 5;
      scheduledAt = new Date(Date.now() + qty * 60 * 1000);
    }

    await connectDB();

    const template = await WhatsAppTemplate.findById(templateId).lean();
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const target = body?.target || { type: 'filters', filters: {} };
    const leadIds = await resolveLeadIdsFromTarget(target);

    const leads = await Lead.find({ _id: { $in: leadIds } }).select({ _id: 1, phoneNumber: 1 }).lean();

    const runStatus = mode === 'now' ? 'draft' : 'scheduled';

    const run = await BroadcastRun.create({
      name,
      createdByUserId: String(decoded?.userId || 'admin'),
      createdByLabel: String(decoded?.userId || 'admin'),
      mode,
      scheduledAt,
      status: runStatus,
      templateId: toObjectId(templateId),
      templateSnapshot: {
        templateName: (template as any).templateName,
        language: (template as any).language,
        headerMedia: (template as any).headerMedia || null,
        buttons: (template as any).buttons || [],
        templateContent: (template as any).templateContent,
      },
      target,
      stats: {
        total: leads.length,
        pending: leads.length,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
    });

    if (leads.length) {
      await BroadcastRunMessage.insertMany(
        leads
          .filter((l: any) => String(l.phoneNumber || '').trim())
          .map((l: any) => ({
            runId: run._id,
            leadId: l._id,
            phoneNumber: String(l.phoneNumber || '').trim(),
            status: 'pending',
          }))
      );

      const missingPhone = leads.filter((l: any) => !String(l.phoneNumber || '').trim()).length;
      if (missingPhone) {
        await BroadcastRun.findByIdAndUpdate(run._id, {
          $set: {
            'stats.skipped': missingPhone,
            'stats.total': leads.length,
            'stats.pending': Math.max(0, leads.length - missingPhone),
          },
        });
      }
    }

    // If mode=now, the UI will call /broadcast-runs/run to start processing immediately.

    const fresh = await BroadcastRun.findById(run._id).lean();
    return NextResponse.json({ success: true, data: fresh }, { status: 201 });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-runs');
  }
}

/**
 * GET /api/admin/crm/broadcast-runs
 * List runs.
 */
export async function GET(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 25) || 25, 100);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    const status = url.searchParams.get('status');
    const filter: any = {};
    if (status) filter.status = String(status);

    const total = await BroadcastRun.countDocuments(filter);
    const rows = await BroadcastRun.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          runs: rows,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs');
  }
}
