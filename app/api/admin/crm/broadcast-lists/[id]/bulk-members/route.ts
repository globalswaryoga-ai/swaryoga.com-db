import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {

  verifyAdminAccess,
  handleCrmError,
  formatCrmSuccess,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { BroadcastList, BroadcastListMember } from '@/lib/schemas/enterpriseSchemas';

// Mark as dynamic since this route uses request.headers or request.url


/**
 * POST /api/admin/crm/broadcast-lists/[id]/bulk-members
 *
 * Add multiple leads to a broadcast list in bulk.
 *
 * Request body:
 * {
 *   "leads": [
 *     { "leadId": "...", "phoneNumber": "..." },
 *     { "leadId": "...", "phoneNumber": "..." }
 *   ]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "added": 10,
 *     "skipped": 2,
 *     "total": 12,
 *     "members": [...]
 *   }
 * }
 */
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const userId = verifyAdminAccess(request);
    const listId = String(context?.params?.id || '').trim();
    if (!listId || !isValidObjectId(listId)) {
      return NextResponse.json({ error: 'Invalid list id' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const leadsInput = Array.isArray(body?.leads) ? body.leads : [];
    if (leadsInput.length === 0) {
      return NextResponse.json({ error: 'leads array is required and cannot be empty' }, { status: 400 });
    }

    // Validate all leads have required fields
    const leads = leadsInput.map((lead: any) => ({
      leadId: String(lead?.leadId || '').trim(),
      phoneNumber: String(lead?.phoneNumber || '').trim(),
    }));

    const invalidLeads = leads.filter((l) => !l.leadId || !l.phoneNumber);
    if (invalidLeads.length > 0) {
      return NextResponse.json(
        { error: `${invalidLeads.length} lead(s) have invalid leadId or phoneNumber` },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the list exists and belongs to this user
    const list = await BroadcastList.findOne({
      _id: toObjectId(listId),
      createdByUserId: String(userId),
    }).lean();

    if (!list) {
      return NextResponse.json({ error: 'Broadcast list not found' }, { status: 404 });
    }

    // Bulk add members (idempotent per leadId)
    let added = 0;
    let skipped = 0;
    const members: any[] = [];
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        const existing = await BroadcastListMember.findOne({
          broadcastListId: toObjectId(listId),
          leadId: toObjectId(lead.leadId),
        }).lean();

        if (existing) {
          skipped++;
          members.push(existing);
        } else {
          const created = await BroadcastListMember.create({
            broadcastListId: toObjectId(listId),
            leadId: toObjectId(lead.leadId),
            phoneNumber: lead.phoneNumber,
            createdByUserId: String(userId),
          });
          added++;
          members.push(created);
        }
      } catch (err) {
        console.error(`Failed to add lead ${lead.leadId} to broadcast list:`, err);
        errors.push(`Lead ${lead.leadId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return formatCrmSuccess({
      added,
      skipped,
      total: added + skipped,
      members,
      errors, // Return errors for debugging
    });
  } catch (error) {
    return handleCrmError(error, 'POST broadcast-lists/[id]/bulk-members');
  }
}
