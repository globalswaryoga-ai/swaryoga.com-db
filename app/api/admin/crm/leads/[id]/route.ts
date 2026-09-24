import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: lead }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const existing = await getBunnyLeadById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update: any = { ...existing };
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.title !== undefined) update.title = String(body.title || '').trim();
    if (body.displayName !== undefined) update.displayName = String(body.displayName || '').trim();
    if (body.email !== undefined) update.email = String(body.email).trim();
    if (body.status !== undefined) update.status = String(body.status).trim();
    if (body.labels !== undefined) {
      update.labels = Array.isArray(body.labels) ? body.labels.map((x: any) => String(x)) : [];
    }
    if (body.workshops !== undefined) {
      update.workshops = Array.isArray(body.workshops) ? body.workshops.map((x: any) => String(x)).filter((x: string) => x.trim()) : [];
    }
    if (body.workshopId !== undefined) update.workshopId = body.workshopId || null;
    if (body.workshopName !== undefined) update.workshopName = body.workshopName || null;
    if (body.metadata !== undefined) update.metadata = body.metadata;

    if (body.assignedToUserId !== undefined) {
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only super admin can assign leads' }, { status: 403 });
      }
      const raw = body.assignedToUserId;
      const next = raw === null || raw === '' ? null : String(raw).trim();
      update.assignedToUserId = next;
    }

    const savedLead = await saveBunnyLead(update, params.id);
    return NextResponse.json({ success: true, data: savedLead }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const existing = await getBunnyLeadById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update: any = { ...existing };
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.email !== undefined) update.email = String(body.email).trim();
    if (body.status !== undefined) update.status = String(body.status).trim();
    if (body.labels !== undefined) {
      update.labels = Array.isArray(body.labels) ? body.labels.map((x: any) => String(x)) : [];
    }
    if (body.workshopId !== undefined) update.workshopId = body.workshopId || null;
    if (body.workshopName !== undefined) update.workshopName = body.workshopName || null;
    if (body.metadata !== undefined) update.metadata = body.metadata;

    if (body.assignedToUserId !== undefined) {
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only super admin can assign leads' }, { status: 403 });
      }
      const raw = body.assignedToUserId;
      const next = raw === null || raw === '' ? null : String(raw).trim();
      update.assignedToUserId = next;
    }

    if (Array.isArray(body.addLabels) && body.addLabels.length > 0) {
      const labelsToAdd = body.addLabels.map((x: any) => String(x));
      const currentLabels = new Set(update.labels || []);
      labelsToAdd.forEach((l) => currentLabels.add(l));
      update.labels = Array.from(currentLabels);
    }
    if (Array.isArray(body.removeLabels) && body.removeLabels.length > 0) {
      const labelsToRemove = body.removeLabels.map((x: any) => String(x));
      update.labels = (update.labels || []).filter((l) => !labelsToRemove.includes(l));
    }

    const savedLead = await saveBunnyLead(update, params.id);
    return NextResponse.json({ success: true, data: savedLead }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const existing = await getBunnyLeadById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM leads_sql WHERE document_id = ?',
      args: [params.id]
    });

    return NextResponse.json({ success: true, data: existing }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
