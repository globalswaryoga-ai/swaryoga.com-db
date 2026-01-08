import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead, WhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

function isMetaDisabled(): boolean {
  return [
    process.env.WHATSAPP_DISABLE_META_UI,
    process.env.WHATSAPP_DISABLE_META_SEND,
    process.env.WHATSAPP_DISABLE_CLOUD_SEND,
    process.env.WHATSAPP_FORCE_WEB_BRIDGE,
    process.env.WHATSAPP_DISABLE_CLOUD,
  ].some((v) => String(v || '').toLowerCase() === 'true');
}

function getViewerUserId(decoded: any): string {
  return String(decoded?.userId || decoded?.username || '').trim();
}

function isSuperAdmin(decoded: any): boolean {
  return decoded?.userId === 'admin' || (Array.isArray(decoded?.permissions) && (decoded.permissions.includes('all') || decoded.permissions.includes('broadcast')));
}

type BulkAction = 'markRead' | 'markUnread' | 'addLabel' | 'removeLabel';

function normalizeLabels(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .slice(0, 50)
    )
  );
}

function normalizeIds(input: any): mongoose.Types.ObjectId[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(String(id));
      } catch {
        return null;
      }
    })
    .filter((x): x is mongoose.Types.ObjectId => Boolean(x));
}

/**
 * POST /api/admin/crm/whatsapp/meta/bulk
 * Bulk operations for Meta WhatsApp inbox
 *
 * Body:
 *  {
 *    action: 'markRead'|'markUnread'|'addLabel'|'removeLabel',
 *    leadIds?: string[],      // preferred
 *    conversationIds?: string[], // accepted (same as leadIds in this inbox)
 *    label?: string
 *  }
 */
export async function POST(request: NextRequest) {
  try {
    if (isMetaDisabled()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
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

    const action: BulkAction = body.action;
    if (!['markRead', 'markUnread', 'addLabel', 'removeLabel'].includes(String(action))) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const rawIds = Array.isArray(body.leadIds) ? body.leadIds : Array.isArray(body.conversationIds) ? body.conversationIds : [];
    const leadObjectIds = normalizeIds(rawIds);
    if (leadObjectIds.length === 0) {
      return NextResponse.json({ error: 'No leadIds provided' }, { status: 400 });
    }

    await connectDB();

    if (action === 'markRead' || action === 'markUnread') {
      const status = action === 'markRead' ? 'read' : 'delivered';
      const isRead = action === 'markRead';

      // We only touch inbound messages; outbound read state is usually irrelevant.
      const result = await WhatsAppMessage.updateMany(
        {
          leadId: { $in: leadObjectIds },
          direction: 'inbound',
          ...(action === 'markRead' ? { isRead: { $ne: true } } : { isRead: true }),
          // For safety, restrict to Meta-origin messages if method field exists.
          $or: [{ method: { $exists: false } }, { method: 'meta' }],
        } as any,
        {
          $set: {
            status,
            isRead,
            ...(action === 'markRead' ? { readAt: new Date() } : { readAt: null }),
            updatedAt: new Date(),
          },
        } as any
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            action,
            leads: leadObjectIds.length,
            modified: result.modifiedCount,
            matched: result.matchedCount,
          },
        },
        { status: 200 }
      );
    }

    // Labels live on Lead documents
    const label = String(body.label || '').trim();
    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    // Access control: follow the same pattern as other CRM endpoints
    // - super admin: can update any
    // - others: only their assigned leads
    const leadFilter: any = {
      _id: { $in: leadObjectIds },
      ...(superAdmin ? {} : { assignedToUserId: viewerUserId }),
    };

    const update =
      action === 'addLabel'
        ? { $addToSet: { labels: { $each: normalizeLabels([label]) } }, $set: { updatedAt: new Date() } }
        : { $pull: { labels: label }, $set: { updatedAt: new Date() } };

    const result = await Lead.updateMany(leadFilter, update);

    return NextResponse.json(
      {
        success: true,
        data: {
          action,
          label,
          leads: leadObjectIds.length,
          modified: result.modifiedCount,
          matched: result.matchedCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed bulk operation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
