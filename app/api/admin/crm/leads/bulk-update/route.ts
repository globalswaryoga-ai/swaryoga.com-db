import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import {
  tenantOrFilter, 
  toObjectId, 
  isValidObjectId, 
  handleCrmError, 
  formatCrmSuccess 
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers or request.url

type Body = {
  leadIds: string[];
  assignedToUserId?: string;
  workshopName?: string;
  status?: string;
  labels?: string[];
  addLabels?: string[];
  removeLabels?: string[];
  isBlocked?: boolean;
  blockedReason?: string;
  blockedBy?: string;
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin || !decoded?.userId) throw new Error('Unauthorized');
    const tf = tenantOrFilter(decoded);

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || !Array.isArray(body.leadIds) || body.leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds is required' }, { status: 400 });
    }

    const { assignedToUserId, workshopName, status, labels, addLabels, removeLabels, isBlocked, blockedReason, blockedBy } = body;

    const objectIds = body.leadIds
      .map((id) => String(id))
      .filter((id) => isValidObjectId(id))
      .map((id) => toObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json({ error: 'No valid leadIds provided' }, { status: 400 });
    }

    await connectDB();

    const update: Record<string, any> = {};
    if (assignedToUserId !== undefined) update.assignedToUserId = String(assignedToUserId).trim();
    if (workshopName !== undefined) update.workshopName = String(workshopName).trim();
    if (status !== undefined) update.status = String(status).trim();
    if (labels !== undefined) update.labels = labels;

    // Block / Unblock support
    if (isBlocked !== undefined) {
      update.isBlocked = Boolean(isBlocked);
      if (isBlocked) {
        update.blockedAt = new Date();
        if (blockedReason) update.blockedReason = String(blockedReason).trim();
        if (blockedBy) update.blockedBy = String(blockedBy).trim();
      } else {
        update.unblockedAt = new Date();
        update.blockedAt = null;
        update.blockedReason = null;
        update.blockedBy = null;
      }
    }

    // Handle add/remove labels if provided (optional complexity)
    const arrayUpdates: Record<string, any> = {};
    if (Array.isArray(addLabels) && addLabels.length > 0) {
      arrayUpdates.$addToSet = { labels: { $each: addLabels } };
    }
    if (Array.isArray(removeLabels) && removeLabels.length > 0) {
      arrayUpdates.$pull = { labels: { $in: removeLabels } };
    }

    const result = await Lead.updateMany(
      { _id: { $in: objectIds }, ...tf },
      { 
        $set: update,
        ...(Object.keys(arrayUpdates).length > 0 ? arrayUpdates : {})
      }
    );

    return formatCrmSuccess({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return handleCrmError(error, 'POST /api/admin/crm/leads/bulk-update');
  }
}
