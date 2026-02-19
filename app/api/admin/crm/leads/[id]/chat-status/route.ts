import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return (
    decoded?.userId === 'admin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
}

/**
 * PATCH /api/admin/crm/leads/[id]/chat-status
 * Update the chat status for a lead (close/reopen)
 * 
 * Body: { chatStatus: 'closed' | 'new' | 'open' | 'pending' | 'overdue' }
 * - Use 'closed' to manually close a conversation
 * - Use any other status to reopen (status will be recalculated based on time)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

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

    await connectDB();
    const Lead = getLead();

    // Check lead exists and user has access
    const lead = await Lead.findById(params.id).lean();
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Non-super-admin can only modify their assigned leads
    if (
      !superAdmin &&
      String((lead as any).assignedToUserId || '').trim() !== viewerUserId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update
    const update: any = {
      chatStatus: body.chatStatus,
    };

    // Track who/when closed the chat
    if (body.chatStatus === 'closed') {
      update.chatStatusClosedAt = new Date();
      update.chatStatusClosedBy = viewerUserId;
    } else {
      // Reopening - clear the closed fields
      update.chatStatusClosedAt = null;
      update.chatStatusClosedBy = null;
    }

    const updated = await Lead.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      data: {
        _id: (updated as any)._id,
        chatStatus: (updated as any).chatStatus,
        chatStatusClosedAt: (updated as any).chatStatusClosedAt,
        chatStatusClosedBy: (updated as any).chatStatusClosedBy,
      },
    });
  } catch (error) {
    console.error('[chat-status] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update chat status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/leads/[id]/chat-status
 * Get current chat status for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    await connectDB();
    const Lead = getLead();

    const lead = await Lead.findById(params.id)
      .select('chatStatus chatStatusClosedAt chatStatusClosedBy lastMessageAt')
      .lean();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: (lead as any)._id,
        chatStatus: (lead as any).chatStatus || 'new',
        chatStatusClosedAt: (lead as any).chatStatusClosedAt,
        chatStatusClosedBy: (lead as any).chatStatusClosedBy,
        lastMessageAt: (lead as any).lastMessageAt,
      },
    });
  } catch (error) {
    console.error('[chat-status] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get chat status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
