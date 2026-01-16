import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { 
  verifyAdminAccess, 
  toObjectId, 
  isValidObjectId, 
  handleCrmError, 
  formatCrmSuccess 
} from '@/lib/crm-handlers';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';

type Body = {
  leadIds: string[];
  assignedToUserId?: string;
  workshopName?: string;
  status?: string;
  labels?: string[];
  addLabels?: string[];
  removeLabels?: string[];
};

export async function POST(request: NextRequest) {
  try {
    verifyAdminAccess(request);

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body || !Array.isArray(body.leadIds) || body.leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds is required' }, { status: 400 });
    }

    const { assignedToUserId, workshopName, status, labels, addLabels, removeLabels } = body;

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

    // Handle add/remove labels if provided (optional complexity)
    const arrayUpdates: Record<string, any> = {};
    if (Array.isArray(addLabels) && addLabels.length > 0) {
      arrayUpdates.$addToSet = { labels: { $each: addLabels } };
    }
    if (Array.isArray(removeLabels) && removeLabels.length > 0) {
      arrayUpdates.$pull = { labels: { $in: removeLabels } };
    }

    const result = await Lead.updateMany(
      { _id: { $in: objectIds } },
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
