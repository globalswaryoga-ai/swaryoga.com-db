import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { loadBunnyLeads, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import {
  broadcastRunCreate,
  broadcastRunMessageInsertMany,
  listBroadcastRuns,
  getTemplateById,
} from '@/lib/bunnyBroadcastRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin && !decoded?.userId) throw new Error('Unauthorized');
  return decoded;
}

function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function isOwned(lead: any, viewerUserId: string, superAdmin: boolean) {
  if (superAdmin) return true;
  if (!lead.createdByUserId || lead.createdByUserId === 'system' || lead.createdByUserId === 'admin') return true;
  return String(lead.createdByUserId || '') === viewerUserId || String(lead.assignedToUserId || '') === viewerUserId;
}

export async function POST(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || '');
    const superAdmin = isSuperAdmin(decoded);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const templateId = String(body.templateId || '').trim();
    if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    const provider = String(body.provider || 'meta');
    if (provider !== 'meta') return NextResponse.json({ error: 'Only Meta broadcasts are supported on this Bunny SQL route' }, { status: 400 });

    const template = await getTemplateById(templateId);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (!superAdmin && String(template.createdBy || template.createdByUserId || '') !== viewerUserId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const mode = String(body.mode || 'now');
    if (!['now', 'schedule', 'delay'].includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    let scheduledAt: Date | null = null;
    if (mode === 'schedule') {
      scheduledAt = new Date(String(body.scheduleAt || ''));
      if (Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ error: 'Valid scheduleAt required' }, { status: 400 });
    } else if (mode === 'delay') {
      const seconds = Number(body.delaySeconds || 0) || Number(body.delayMins || 5) * 60;
      scheduledAt = new Date(Date.now() + Math.max(1, seconds) * 1000);
    }

    const allLeads = await loadBunnyLeads();
    const target = body.target || { type: 'filters', filters: {} };
    const csvContacts = Array.isArray(target.csvContacts) ? target.csvContacts : [];
    let leads = allLeads.filter((lead: any) => !lead.isBlocked && isOwned(lead, viewerUserId, superAdmin));

    if (Array.isArray(target.leadIds) && target.leadIds.length > 0) {
      const wanted = new Set(target.leadIds.map((id: unknown) => String(id)));
      leads = leads.filter((lead: any) => wanted.has(String(lead._id)) || wanted.has(String(lead.id)) || wanted.has(String(lead.document_id)));
    } else if (Array.isArray(target.leadIds) && target.leadIds.length === 0 && csvContacts.length === 0) {
      leads = [];
    } else if (target.type === 'filters' || !target.type) {
      const filters = target.filters || {};
      if (filters.status) leads = leads.filter((lead: any) => String(lead.status || '') === String(filters.status));
      if (filters.workshopName) leads = leads.filter((lead: any) => String(lead.workshopName || '') === String(filters.workshopName));
      if (filters.assignedToUserId) leads = leads.filter((lead: any) => String(lead.assignedToUserId || '') === String(filters.assignedToUserId));
      if (filters.label) leads = leads.filter((lead: any) => Array.isArray(lead.labels) && lead.labels.includes(String(filters.label)));
    } else if (target.type === 'broadcastList') {
      return NextResponse.json({ error: 'Broadcast lists are not yet migrated to Bunny SQL' }, { status: 400 });
    }

    const csvContacts = Array.isArray(target.csvContacts) ? target.csvContacts : [];
    for (const contact of csvContacts) {
      const phoneNumber = normalizePhone(contact.phoneNumber);
      if (phoneNumber.length < 10) continue;
      let lead = allLeads.find((candidate: any) => normalizePhone(candidate.phoneNumber).slice(-10) === phoneNumber.slice(-10));
      if (!lead) {
        lead = await saveBunnyLead({ name: contact.name || 'CSV Import', phoneNumber, email: contact.email || undefined, status: 'csv-import', source: 'csv-broadcast', createdByUserId: viewerUserId, assignedToUserId: viewerUserId });
      }
      if (!leads.some((candidate: any) => String(candidate._id) === String(lead._id))) leads.push(lead);
    }

    const unique = new Map<string, any>();
    for (const lead of leads) {
      const phone = normalizePhone(lead.phoneNumber);
      if (phone.length >= 10 && !unique.has(phone.slice(-10))) unique.set(phone.slice(-10), { ...lead, phoneNumber: phone });
    }
    const finalLeads = [...unique.values()];
    const run = await broadcastRunCreate({
      name: String(body.name || '').trim() || `Broadcast ${new Date().toLocaleString('en-IN')}`,
      createdByUserId: viewerUserId,
      createdByLabel: viewerUserId,
      mode,
      provider,
      scheduledAt,
      status: mode === 'now' ? 'draft' : 'scheduled',
      templateId,
      templateSnapshot: template,
      target,
      stats: { total: finalLeads.length, pending: finalLeads.length, sent: 0, failed: 0, skipped: 0 },
    });

    await broadcastRunMessageInsertMany(finalLeads.map((lead: any) => ({ runId: run._id, leadId: lead._id, phoneNumber: lead.phoneNumber })));
    return NextResponse.json({
      success: true,
      data: run,
      dedup: { originalCount: leads.length, duplicatesRemoved: leads.length - finalLeads.length, blockedSkipped: 0, alreadySentRemoved: 0, finalCount: finalLeads.length },
    }, { status: 201 });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-runs');
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded: any = verifyAdmin(request);
    const viewerUserId = String(getViewerUserId(decoded) || decoded?.userId || '');
    const superAdmin = isSuperAdmin(decoded);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0), 0);
    const provider = url.searchParams.get('provider') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const userId = superAdmin && url.searchParams.get('userId') ? url.searchParams.get('userId')! : undefined;
    const listed = await listBroadcastRuns({ provider, status, createdByUserId: userId || viewerUserId, isSuperAdmin: superAdmin && !userId }, { limit, skip });
    return NextResponse.json({ success: true, data: { runs: listed.runs, total: listed.total, limit, skip, summary: {} } }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'GET broadcast-runs');
  }
}
