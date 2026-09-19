import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getBunnyLeadById, saveBunnyLead } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing user identity' },
        { status: 401 }
      );
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body || typeof body.chatStatus !== 'string') {
      return NextResponse.json(
        { error: 'Invalid body: chatStatus is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['new', 'open', 'pending', 'overdue', 'closed'];
    if (!validStatuses.includes(body.chatStatus)) {
      return NextResponse.json(
        { error: `Invalid chatStatus. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (
      !superAdmin &&
      String(lead.assignedToUserId || '').trim() !== viewerUserId &&
      String(lead.createdByUserId || '').trim() !== viewerUserId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const update = { ...lead, chatStatus: body.chatStatus };

    if (body.chatStatus === 'closed') {
      update.chatStatusClosedAt = new Date().toISOString();
      update.chatStatusClosedBy = viewerUserId;
    } else {
      update.chatStatusClosedAt = null;
      update.chatStatusClosedBy = null;
    }

    const updated = await saveBunnyLead(update, params.id);

    return NextResponse.json({
      success: true,
      data: {
        _id: updated._id,
        chatStatus: updated.chatStatus,
        chatStatusClosedAt: updated.chatStatusClosedAt,
        chatStatusClosedBy: updated.chatStatusClosedBy,
      },
    });
  } catch (error) {
    console.error('[chat-status] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update chat status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const lead = await getBunnyLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: lead._id,
        chatStatus: lead.chatStatus || 'new',
        chatStatusClosedAt: lead.chatStatusClosedAt,
        chatStatusClosedBy: lead.chatStatusClosedBy,
        lastMessageAt: lead.lastMessageAt,
      },
    });
  } catch (error) {
    console.error('[chat-status] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get chat status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
