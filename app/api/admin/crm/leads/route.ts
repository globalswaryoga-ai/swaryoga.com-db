import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import {
  escapeRegexLiteral,
  getViewerUserId,
  isSuperAdmin,
  isManager,
  getVisibleUserIds,
  normalizePhone
} from '@/lib/crm-handlers';
import { getTenantFilter, enrichTenantData } from '@/lib/crm/tenantIsolation';

export const dynamic = 'force-dynamic';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { logger } from '@/lib/logger';
import { listBunnyLeads } from '@/lib/bunnyLeadsRepository';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);
    const manager = isManager(decoded);
    const visibleUserIds = getVisibleUserIds(decoded);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const workshop = url.searchParams.get('workshop');
    const label = url.searchParams.get('label');
    const q = url.searchParams.get('q');
    const userIdParam = url.searchParams.get('userId');
    const source = url.searchParams.get('source');
    const excludeSource = url.searchParams.get('excludeSource');
    const requestedLimit = Number(url.searchParams.get('limit') || 50) || 50;
    const selectAll = url.searchParams.get('selectAll') === 'true';
    const maxLimit = selectAll ? 10000 : 200;
    const limit = Math.min(requestedLimit, maxLimit);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    const bunnyResult = await listBunnyLeads({
      visibleUserIds,
      viewerUserId,
      status,
      workshop,
      label,
      source,
      excludeSource,
      q,
      userId: userIdParam,
      skip,
      limit,
    });
    
    return NextResponse.json({ success: true, data: bunnyResult }, { status: 200, headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' } });
  } catch (error) {
    logger.error('leads', 'GET /api/admin/crm/leads failed', error);
    const message = error instanceof Error ? error.message : 'Failed to load leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const rawPhone = String(body?.phoneNumber || '').trim();
    if (!rawPhone) {
      return NextResponse.json({ error: 'Missing: phoneNumber' }, { status: 400 });
    }
    const phoneNumber = normalizePhone(rawPhone);

    const name = body?.name ? String(body.name).trim() : undefined;
    const email = body?.email ? String(body.email).trim().toLowerCase() : undefined;
    const status = body?.status ? String(body.status).trim() : undefined;
    const labels = Array.isArray(body?.labels) ? body.labels.map((x: any) => String(x)) : undefined;
    const source = body?.source ? String(body.source).trim() : undefined;
    const workshopId = body?.workshopId ? String(body.workshopId).trim() : undefined;
    const workshopName = body?.workshopName ? String(body.workshopName).trim() : undefined;

    const requestedAssignedTo = body?.assignedToUserId ? String(body.assignedToUserId).trim() : '';
    const assignedToUserId = superAdmin && requestedAssignedTo ? requestedAssignedTo : viewerUserId;

    const { getBunnyLeadByPhone, saveBunnyLead } = await import('@/lib/bunnyLeadsRepository');
    const existingLead = await getBunnyLeadByPhone(phoneNumber, viewerUserId);

    if (existingLead) {
      // Merge with existing lead instead of duplicating or erroring
      const mergedLabels = Array.from(new Set([
        ...(existingLead.labels || []),
        ...(labels || [])
      ]));

      const updatedLead = await saveBunnyLead({
        ...existingLead,
        name: existingLead.name && existingLead.name !== 'Unknown User' ? existingLead.name : (name || existingLead.name),
        email: existingLead.email || email,
        status: status || existingLead.status,
        labels: mergedLabels,
        source: existingLead.source || source,
        workshopId: existingLead.workshopId || workshopId,
        workshopName: existingLead.workshopName || workshopName
      }, existingLead._id);

      return NextResponse.json({ success: true, data: updatedLead, merged: true }, { status: 200 });
    }

    // TODO (Phase 4): lead numbering generation relies on a MongoDB collection. For now, generate random string
    const leadNumber = 'L' + Math.floor(Math.random() * 1000000);

    const lead = await saveBunnyLead({
      leadNumber,
      phoneNumber,
      assignedToUserId,
      createdByUserId: viewerUserId,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(status ? { status } : {}),
      ...(labels ? { labels } : {}),
      ...(source ? { source } : {}),
      ...(workshopId ? { workshopId } : {}),
      ...(workshopName ? { workshopName } : {}),
      createdAt: new Date().toISOString()
    });

    try {
      // await addLeadToMainBroadcastList(lead); // Disable since broadcast relies on Mongo
    } catch (e) {}

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    logger.error('leads', 'POST /api/admin/crm/leads failed', error);
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
