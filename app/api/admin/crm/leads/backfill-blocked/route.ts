/**
 * POST /api/admin/crm/leads/backfill-blocked
 * One-time migration: find all leads that appear as blocked in
 * broadcast_run_messages (error 131026) but are NOT yet in deleted_leads,
 * then archive them to deleted_leads with reason 'meta_blocked' and remove
 * them from the leads collection.
 *
 * Safe to call multiple times — skips any phone already in deleted_leads.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
    }

    await connectDB();
    const db = mongoose.connection.db!;

    // 1. Collect all unique phone numbers that were blocked in broadcasts
    const blockedMessages = await db.collection('broadcast_run_messages').find(
      { status: 'blocked' },
      { projection: { phoneNumber: 1, leadId: 1, failureCode: 1, _id: 0 } }
    ).toArray();

    const phoneToLeadId = new Map<string, string>();
    for (const msg of blockedMessages) {
      const phone = String(msg.phoneNumber || '').trim();
      if (phone && !phoneToLeadId.has(phone)) {
        phoneToLeadId.set(phone, String(msg.leadId || ''));
      }
    }

    // 2. Phones already in deleted_leads — skip them
    const existingDeleted = await db.collection('deleted_leads')
      .find({ phoneNumber: { $in: [...phoneToLeadId.keys()] } }, { projection: { phoneNumber: 1, _id: 0 } })
      .toArray();
    const alreadyArchived = new Set(existingDeleted.map((d: any) => String(d.phoneNumber)));

    const toProcess = [...phoneToLeadId.entries()].filter(([phone]) => !alreadyArchived.has(phone));

    if (toProcess.length === 0) {
      return NextResponse.json({ success: true, archived: 0, message: 'All blocked numbers already in deleted_leads.' });
    }

    // 3. For each phone, find its lead and archive it
    let archived = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [phone, hintLeadId] of toProcess) {
      try {
        // Try to find lead by phone (most reliable)
        const lead = await db.collection('leads').findOne({ phoneNumber: phone }) as any;

        if (!lead) {
          // Lead already deleted but not archived — create a stub archive record
          await db.collection('deleted_leads').insertOne({
            leadId: hintLeadId ? new mongoose.Types.ObjectId(hintLeadId) : new mongoose.Types.ObjectId(),
            leadNumber: '',
            name: phone,
            phoneNumber: phone,
            email: '',
            workshopName: '',
            assignedToUserId: '',
            createdByUserId: '',
            deletedByUserId: 'system-backfill',
            status: 'blocked',
            labels: [],
            source: '',
            deletedAt: new Date(),
            deletedReason: 'meta_blocked',
            metadata: { autoDeleteReason: 'Backfill: blocked in Meta broadcast (131026)', backfilled: true },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          archived++;
          continue;
        }

        // Archive the lead
        await db.collection('deleted_leads').insertOne({
          leadId: lead._id,
          leadNumber: lead.leadNumber || String(lead._id),
          name: lead.name || phone,
          phoneNumber: phone,
          email: lead.email || '',
          workshopName: lead.workshopName || lead.workshop || '',
          assignedToUserId: lead.assignedToUserId || lead.userId || '',
          createdByUserId: lead.createdByUserId || '',
          deletedByUserId: 'system-backfill',
          status: lead.status || '',
          labels: lead.labels || [],
          source: lead.source || '',
          createdAtOriginal: lead.createdAt,
          updatedAtOriginal: lead.updatedAt,
          deletedAt: new Date(),
          deletedReason: 'meta_blocked',
          metadata: {
            autoDeleteReason: 'Backfill: blocked in Meta broadcast (131026)',
            backfilled: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Delete from leads
        await db.collection('leads').deleteOne({ _id: lead._id });
        // Clean up funnel history
        await db.collection('funnel_stage_history').deleteMany({ leadId: lead._id }).catch(() => {});

        archived++;
      } catch (err: any) {
        errors.push(`${phone}: ${err.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      archived,
      skipped,
      alreadyArchived: alreadyArchived.size,
      total: phoneToLeadId.size,
      errors: errors.slice(0, 10),
      message: `Backfill complete: ${archived} blocked leads moved to Deleted Leads.`,
    });
  } catch (err: any) {
    console.error('[backfill-blocked]', err);
    return NextResponse.json({ error: err.message || 'Backfill failed' }, { status: 500 });
  }
}
