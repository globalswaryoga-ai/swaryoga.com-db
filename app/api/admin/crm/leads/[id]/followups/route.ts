import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let followUps = lead.followUps || [];
    if (statusFilter) {
      followUps = followUps.filter((f: any) => f.status === statusFilter);
    }

    return NextResponse.json({ 
      success: true, 
      data: followUps.sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) 
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get follow-ups';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body || !body.dueAt) {
      return NextResponse.json({ error: 'Invalid body: dueAt is required' }, { status: 400 });
    }

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newFollowUp = {
      _id: Math.random().toString(36).substring(2, 11),
      leadId: params.id,
      createdByUserId: viewerUserId,
      assignedToUserId: String(body.assignedToUserId || viewerUserId).trim(),
      title: String(body.title || 'Follow up').trim(),
      description: String(body.description || '').trim(),
      dueAt: body.dueAt,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const followUps = lead.followUps || [];
    followUps.push(newFollowUp);
    
    await saveBunnyLead({ ...lead, followUps }, params.id);
    return NextResponse.json({ success: true, data: newFollowUp }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create follow-up';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const followUpId = url.searchParams.get('followUpId');
    if (!followUpId) return NextResponse.json({ error: 'Invalid followUpId' }, { status: 400 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const lead = await getBunnyLeadById(params.id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let followUps = lead.followUps || [];
    const index = followUps.findIndex((f: any) => f._id === followUpId);
    if (index === -1) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });

    if (!superAdmin && followUps[index].createdByUserId !== viewerUserId && followUps[index].assignedToUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.title !== undefined) followUps[index].title = String(body.title).trim();
    if (body.description !== undefined) followUps[index].description = String(body.description).trim();
    if (body.dueAt !== undefined) followUps[index].dueAt = body.dueAt;
    if (body.status !== undefined) {
      followUps[index].status = body.status;
      if (body.status === 'done' || body.status === 'cancelled') {
        followUps[index].completedAt = new Date().toISOString();
      } else {
        followUps[index].completedAt = null;
      }
    }
    if (body.assignedToUserId !== undefined && superAdmin) {
      followUps[index].assignedToUserId = String(body.assignedToUserId).trim();
    }
    followUps[index].updatedAt = new Date().toISOString();

    await saveBunnyLead({ ...lead, followUps }, params.id);
    return NextResponse.json({ success: true, data: followUps[index] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update follow-up';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const followUpId = url.searchParams.get('followUpId');
    if (!followUpId) return NextResponse.json({ error: 'Invalid followUpId' }, { status: 400 });

    const lead = await getBunnyLeadById(params.id);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    if (!superAdmin && String(lead.assignedToUserId || '').trim() !== viewerUserId && String(lead.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let followUps = lead.followUps || [];
    const index = followUps.findIndex((f: any) => f._id === followUpId);
    if (index === -1) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });

    if (!superAdmin && followUps[index].createdByUserId !== viewerUserId && followUps[index].assignedToUserId !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = followUps[index];
    followUps.splice(index, 1);

    await saveBunnyLead({ ...lead, followUps }, params.id);
    return NextResponse.json({ success: true, data: deleted }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete follow-up';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
