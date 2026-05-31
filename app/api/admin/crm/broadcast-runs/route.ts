import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { BroadcastListMember, BroadcastRun, BroadcastRunMessage, Lead, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
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

async function resolveLeadIdsFromTarget(
  target: any,
  viewerUserId: string,
  superAdmin: boolean,
): Promise<mongoose.Types.ObjectId[]> {
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

  // filters — always scope to viewer's own leads
  const filters = target?.filters || {};
  const q: any = {};
  if (!superAdmin) {
    q.$or = [{ createdByUserId: viewerUserId }, { assignedToUserId: viewerUserId }];
  }
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
    const overrideImageUrl = String(body?.overrideImageUrl || '').trim();

    const mode = String(body?.mode || 'now');
    const allowed = new Set(['now', 'schedule', 'delay']);
    if (!allowed.has(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    // Provider: 'meta' (Cloud API) or 'qr' (QR Bridge)
    const provider = String(body?.provider || 'meta');
    const allowedProviders = new Set(['meta', 'qr']);
    if (!allowedProviders.has(provider)) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

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
      // Support both delaySeconds (new) and delayMins (legacy)
      const secs = Number(body?.delaySeconds ?? 0);
      const mins = Number(body?.delayMins ?? 0);
      
      // Prefer delaySeconds if provided, otherwise convert delayMins to seconds
      let totalSeconds = 0;
      if (secs > 0) {
        totalSeconds = secs;
      } else if (mins > 0) {
        totalSeconds = mins * 60;
      } else {
        totalSeconds = 5 * 60; // Default 5 minutes
      }
      
      scheduledAt = new Date(Date.now() + totalSeconds * 1000);
    }

    await connectDB();

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || 'admin');

    // Verify template ownership — non-superadmins can only use their own templates
    const templateQuery: any = { _id: toObjectId(templateId) };
    if (!superAdmin) templateQuery.createdBy = viewerUserId;
    const template = await WhatsAppTemplate.findOne(templateQuery).lean();
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const target = body?.target || { type: 'filters', filters: {} };
    const leadIds = await resolveLeadIdsFromTarget(target, viewerUserId, superAdmin);

    // Handle CSV contacts — create leads on-the-fly for new phone numbers
    const csvContacts: Array<{ name?: string; phoneNumber: string; email?: string }> = target?.csvContacts || [];
    if (csvContacts.length > 0) {
      for (const c of csvContacts) {
        const phone = String(c.phoneNumber || '').replace(/\D/g, '');
        if (!phone || phone.length < 10) continue;
        // Check if lead already exists by phone
        const existing = await Lead.findOne({ phoneNumber: { $regex: phone.slice(-10) + '$' } }).select({ _id: 1 }).lean();
        if (existing) {
          // Already tracked via leadIds — add if not present
          const oid = toObjectId(String((existing as any)._id));
          if (!leadIds.find(id => id.equals(oid))) leadIds.push(oid);
        } else {
          // Create new lead from CSV contact
          const newLead = await Lead.create({
            name: c.name || 'CSV Import',
            phoneNumber: phone,
            email: c.email || undefined,
            status: 'csv-import',
            source: 'csv-broadcast',
            createdByUserId: viewerUserId,
            assignedToUserId: viewerUserId,
          });
          leadIds.push(toObjectId(String(newLead._id)));
        }
      }
    }

    const leads = await Lead.find({ _id: { $in: leadIds } }).select({ _id: 1, phoneNumber: 1 }).lean();

    // --- Deduplicate leads by normalized phone number ---
    // Same phone number may appear under multiple lead records (e.g. customer + lead).
    // Keep only one entry per unique phone to avoid sending the same message twice.
    const seenPhones = new Set<string>();
    const uniqueLeads = leads.filter((l: any) => {
      const raw = String(l.phoneNumber || '').replace(/\D/g, '');
      const normalized = raw.length >= 10 ? raw.slice(-10) : raw;
      if (!normalized || seenPhones.has(normalized)) return false;
      seenPhones.add(normalized);
      return true;
    });
    const duplicatesRemoved = leads.length - uniqueLeads.length;

    // --- Check for recently sent same template to these numbers (last 24 hours) ---
    // Prevent re-sending the same template to the same number within 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uniquePhones = uniqueLeads.map((l: any) => String(l.phoneNumber || '').trim()).filter(Boolean);
    const recentlySent = await BroadcastRunMessage.find({
      phoneNumber: { $in: uniquePhones },
      status: { $in: ['sent', 'delivered', 'read'] },
      sentAt: { $gte: dayAgo },
    }).populate({ path: 'runId', select: 'templateId' }).lean();
    
    // Build set of phones that already received this exact template in last 24h
    const alreadySentPhones = new Set<string>();
    for (const msg of recentlySent) {
      const msgTemplateId = String((msg as any).runId?.templateId || '');
      if (msgTemplateId === templateId) {
        const norm = String((msg as any).phoneNumber || '').replace(/\D/g, '').slice(-10);
        alreadySentPhones.add(norm);
      }
    }

    // Filter out leads that already received this template recently
    const finalLeads = uniqueLeads.filter((l: any) => {
      const norm = String(l.phoneNumber || '').replace(/\D/g, '').slice(-10);
      return !alreadySentPhones.has(norm);
    });
    const alreadySentCount = uniqueLeads.length - finalLeads.length;

    const runStatus = mode === 'now' ? 'draft' : 'scheduled';

    // ── ANTI-BAN PROTECTION: Check recipient count and warn about rate limiting ──
    const { calculateRateLimitTiming } = await import('@/lib/whatsappRateLimiter');
    const timing = calculateRateLimitTiming(finalLeads.length);
    
    // Warn if sending immediately to many recipients
    if (mode === 'now' && finalLeads.length > 50) {
      console.warn(`[Broadcast] ⚠️  WARNING: Immediate send to ${finalLeads.length} leads will trigger WhatsApp rate limits!`);
      // Return warning but let them proceed - they've been warned
    }
    
    const timingDesc = provider === 'meta'
      ? `1-2 sec gaps (Meta approved: ${finalLeads.length} msgs = ~${Math.ceil(finalLeads.length * 1.5 / 60)}min)`
      : `batches of 3-6, delays 20-60sec (QR safe mode)`;
    console.log(`[Broadcast] 📊 Provider: ${provider} | ${timingDesc}`);

    // Message interval settings (following WhatsApp guidelines)
    // For Meta: 1-2 seconds (approved by Meta, ensures good delivery quality)
    // For QR: 30-60 seconds (conservative, avoids auto-signout)
    const isMetaProvider = provider === 'meta';
    const messageInterval: any = {
      enabled: body?.messageInterval?.enabled !== false, // default true for backward compat
      minSeconds: isMetaProvider
        ? Math.max(1, Math.min(5, Number(body?.messageInterval?.minSeconds ?? 1)))      // Meta: 1-2 sec
        : Math.max(5, Math.min(300, Number(body?.messageInterval?.minSeconds ?? 30))),  // QR: 30-60 sec
      maxSeconds: isMetaProvider
        ? Math.max(1, Math.min(5, Number(body?.messageInterval?.maxSeconds ?? 2)))      // Meta: 1-2 sec
        : Math.max(10, Math.min(300, Number(body?.messageInterval?.maxSeconds ?? 60))), // QR: 30-60 sec
    };
    // For Meta provider, ENABLE interval (1-2 sec gaps for quality)
    if (provider === 'meta' && body?.messageInterval?.enabled === undefined) {
      messageInterval.enabled = true;
    }
    // For QR provider, disable by default (QR uses batch intervals instead)
    if (provider === 'qr' && body?.messageInterval?.enabled === undefined) {
      messageInterval.enabled = false;
    }
    // Ensure max >= min
    if (messageInterval.maxSeconds < messageInterval.minSeconds) {
      messageInterval.maxSeconds = messageInterval.minSeconds;
    }

    const run = await BroadcastRun.create({
      name,
      createdByUserId: viewerUserId,
      createdByLabel: viewerUserId,
      mode,
      provider, // 'meta' or 'qr'
      scheduledAt,
      status: runStatus,
      templateId: toObjectId(templateId),
      messageInterval,
      templateSnapshot: {
        templateName: (template as any).templateName,
        language: (template as any).language,
        headerFormat: (template as any).headerFormat || null,
        headerContent: (template as any).headerContent || null,
        imageFile: (template as any).imageFile || null,
        headerMedia: overrideImageUrl
          ? { kind: 'image', url: overrideImageUrl }
          : ((template as any).headerMedia || null),
        footerText: (template as any).footerText || null,
        buttons: (template as any).buttons || [],
        templateContent: (template as any).templateContent,
      },
      target,
      stats: {
        total: finalLeads.length,
        pending: finalLeads.length,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
    });

    if (finalLeads.length) {
      await BroadcastRunMessage.insertMany(
        finalLeads
          .filter((l: any) => String(l.phoneNumber || '').trim())
          .map((l: any) => ({
            runId: run._id,
            leadId: l._id,
            phoneNumber: String(l.phoneNumber || '').trim(),
            status: 'pending',
          }))
      );

      const missingPhone = finalLeads.filter((l: any) => !String(l.phoneNumber || '').trim()).length;
      if (missingPhone) {
        await BroadcastRun.findByIdAndUpdate(run._id, {
          $set: {
            'stats.skipped': missingPhone,
            'stats.total': finalLeads.length,
            'stats.pending': Math.max(0, finalLeads.length - missingPhone),
          },
        });
      }
    }

    // If mode=now, the UI will call /broadcast-runs/run to start processing immediately.

    const fresh = await BroadcastRun.findById(run._id).lean();
    return NextResponse.json({
      success: true,
      data: fresh,
      dedup: {
        originalCount: leads.length,
        duplicatesRemoved,
        alreadySentRemoved: alreadySentCount,
        finalCount: finalLeads.length,
      },
    }, { status: 201 });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-runs');
  }
}

/**
 * GET /api/admin/crm/broadcast-runs
 * List runs — Non-superadmins only see their own broadcasts.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyAdmin(request);
    await connectDB();

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 25) || 25, 100);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    const status = url.searchParams.get('status');
    const provider = url.searchParams.get('provider');
    const allUsers = url.searchParams.get('allUsers') === 'true';
    const userIdParam = url.searchParams.get('userId');
    const filter: any = {};
    if (status) filter.status = String(status);
    if (provider && ['meta', 'qr'].includes(provider)) filter.provider = provider;

    const superAdmin = isSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);

    if (superAdmin && allUsers) {
      // Super-admin requesting all users — no userId filter
      if (userIdParam) filter.createdByUserId = String(userIdParam);
    } else if (superAdmin) {
      // Super-admin default: show all (no filter) — same as allUsers for superadmin
    } else {
      // Regular admin: own broadcasts only
      filter.createdByUserId = viewerUserId;
    }

    const total = await BroadcastRun.countDocuments(filter);
    const rows = await BroadcastRun.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Aggregate real per-status counts from broadcast_run_messages for summary
    const { BroadcastRunMessage } = await import('@/lib/schemas/enterpriseSchemas');
    const runIds = rows.map((r: any) => r._id);
    const msgAgg = runIds.length > 0
      ? await BroadcastRunMessage.aggregate([
          { $match: { runId: { $in: runIds } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
      : [];
    const msgCounts: Record<string, number> = {};
    for (const m of msgAgg) msgCounts[String(m._id)] = Number(m.count);

    // All-time summary (all runs matching provider filter, not just this page)
    const allFilter: any = provider ? { provider } : {};
    if (!superAdmin) allFilter.createdByUserId = viewerUserId;
    const summaryAgg = await BroadcastRunMessage.aggregate([
      { $lookup: { from: 'broadcast_runs', localField: 'runId', foreignField: '_id', as: 'run' } },
      { $match: provider ? { 'run.provider': provider } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const summary: Record<string, number> = {};
    for (const s of summaryAgg) summary[String(s._id)] = Number(s.count);

    return NextResponse.json(
      {
        success: true,
        data: {
          runs: rows,
          total,
          limit,
          skip,
          summary, // real per-status totals from broadcast_run_messages
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs');
  }
}
