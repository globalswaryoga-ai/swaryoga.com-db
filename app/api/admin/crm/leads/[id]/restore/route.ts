/**
 * POST /api/admin/crm/leads/[id]/restore
 * Restore a soft-deleted lead from the deleted_leads snapshot.
 * Re-creates the lead in the leads collection and removes the deletion record.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getDeletedLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const Lead = getLead();
    const DeletedLead = getDeletedLead();

    // Find the deletion record (id = leadId stored in deleted_leads)
    const deletionRecord = await DeletedLead.findOne({
      $or: [
        { _id: params.id },
        { leadId: params.id },
      ],
    }).lean() as any;

    if (!deletionRecord) {
      return NextResponse.json({ error: 'Deleted lead not found' }, { status: 404 });
    }

    // Check if lead already exists by _id OR phone number (handles duplicate-key case)
    const existingById = await Lead.findById(deletionRecord.leadId).lean();
    const existingByPhone = deletionRecord.phoneNumber
      ? await Lead.findOne({ phoneNumber: deletionRecord.phoneNumber }).lean()
      : null;
    const existing = existingById || existingByPhone;

    if (existing) {
      // Already active — unblock it, clean up deletion record, done
      await Lead.updateOne(
        { _id: (existing as any)._id },
        { $set: { isBlocked: false, waFailCount: 0 } }
      );
      await DeletedLead.findByIdAndDelete(deletionRecord._id);
      return NextResponse.json({
        success: true,
        message: `Lead "${deletionRecord.name || deletionRecord.phoneNumber}" is already active — unblocked and restored.`,
        lead: existing,
      });
    }

    // Re-create the lead with original data
    const restoredLead = await Lead.create({
      _id: deletionRecord.leadId,
      leadNumber: deletionRecord.leadNumber,
      name: deletionRecord.name || 'Restored Lead',
      phoneNumber: deletionRecord.phoneNumber,
      email: deletionRecord.email,
      workshopName: deletionRecord.workshopName,
      status: deletionRecord.status || 'lead',
      labels: deletionRecord.labels || [],
      source: deletionRecord.source || 'manual',
      assignedToUserId: deletionRecord.assignedToUserId,
      createdByUserId: deletionRecord.createdByUserId,
      isBlocked: false,
      waFailCount: 0,
      metadata: deletionRecord.metadata,
      createdAt: deletionRecord.createdAtOriginal,
    });

    await DeletedLead.findByIdAndDelete(deletionRecord._id);

    return NextResponse.json({
      success: true,
      message: `Lead "${deletionRecord.name || deletionRecord.phoneNumber}" restored successfully.`,
      lead: restoredLead,
    });
  } catch (err: any) {
    console.error('[restore lead]', err);
    return NextResponse.json({ error: err.message || 'Restore failed' }, { status: 500 });
  }
}
