import { NextRequest, NextResponse } from 'next/server';
import { connectDB, WorkshopSeatInventory } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { DeletedLead, Lead, LeadNote, getSalesReport } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

// Mark as dynamic since this route uses request.headers or request.url
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    await connectDB();
    const lead: any = await Lead.findById(params.id).lean();
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.title !== undefined) update.title = String(body.title || '').trim();
    if (body.displayName !== undefined) update.displayName = String(body.displayName || '').trim();
    if (body.email !== undefined) update.email = String(body.email).trim();
    if (body.status !== undefined) update.status = String(body.status).trim();
    if (body.labels !== undefined) {
      update.labels = Array.isArray(body.labels) ? body.labels.map((x: any) => String(x)) : [];
    }
    if (body.workshopId !== undefined) update.workshopId = body.workshopId || null;
    if (body.workshopName !== undefined) update.workshopName = body.workshopName || null;
    if (body.metadata !== undefined) update.metadata = body.metadata;

    // Assignment is privileged: only super-admin can assign/unassign
    if (body.assignedToUserId !== undefined) {
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only super admin can assign leads' }, { status: 403 });
      }
      const raw = body.assignedToUserId;
      const next = raw === null || raw === '' ? null : String(raw).trim();
      update.assignedToUserId = next;
    }

    await connectDB();
    const existing: any = await Lead.findById(params.id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lead = await Lead.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // -- LOG CHANGES AS NOTES (SYSTEM HISTORY) --
    const notesToCreate: any[] = [];
    
    // 1. Status Change
    if (update.status && existing.status !== update.status) {
      notesToCreate.push({
        leadId: existing._id,
        note: `System: Status changed from "${existing.status}" to "${update.status}"`,
        createdByUserId: 'system',
        pinned: false,
      });

      // AUTO-ADD TO SALES: When status changes to 'customer', create a sale record
      if (update.status === 'customer' && existing.status !== 'customer') {
        const saleCreated = await autoAddToSales(existing, lead, viewerUserId);
        if (saleCreated) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Auto-added to Sales as customer converted`,
            createdByUserId: 'system',
            pinned: false,
          });
        }

        // DECREMENT WORKSHOP SLOT: When lead becomes customer, reduce available seats
        const slotDecremented = await decrementWorkshopSlot(lead);
        if (slotDecremented) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Workshop seat decremented (manual conversion)`,
            createdByUserId: 'system',
            pinned: false,
          });
        }
      }
    }

    // 2. Labels Change
    if (update.labels) {
       const oldLabels = (existing.labels || []).join(',');
       const newLabels = update.labels.join(',');
       if (oldLabels !== newLabels) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Labels updated to: ${update.labels.join(', ')}`,
            createdByUserId: 'system',
            pinned: false
          });
       }
    }

    // 3. Assignment Change
    if (update.assignedToUserId !== undefined && existing.assignedToUserId !== update.assignedToUserId) {
       const newVal = update.assignedToUserId || 'Unassigned';
       notesToCreate.push({
          leadId: existing._id,
          note: `System: Re-assigned to user: ${newVal}`,
          createdByUserId: 'system',
          pinned: false
       });
    }

    if (notesToCreate.length > 0) {
       await LeadNote.insertMany(notesToCreate);
    }
    
    return NextResponse.json({ success: true, data: lead }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to auto-create a sale when lead becomes a customer
async function autoAddToSales(existing: any, lead: any, viewerUserId: string) {
  try {
    const SalesReport = getSalesReport();
    // Check if a sale already exists for this lead to avoid duplicates
    const existingSale = await SalesReport.findOne({ leadId: existing._id }).lean();
    if (!existingSale) {
      await SalesReport.create({
        leadId: existing._id,
        customerId: lead.leadNumber || existing._id.toString(),
        customerName: lead.name || existing.name || '',
        customerPhone: lead.phoneNumber || existing.phoneNumber || '',
        customerEmail: lead.email || existing.email || '',
        workshopName: lead.workshopName || existing.workshopName || '',
        reportedByUserId: viewerUserId,
        saleAmount: 0, // To be updated manually
        paymentMode: 'other',
        status: 'pending', // Pending until payment details are added
        saleDate: new Date(),
      });
      return true; // Sale created
    }
    return false; // Sale already exists
  } catch (saleError) {
    console.error('Auto-add to sales failed:', saleError);
    return false;
  }
}

// Helper function to decrement workshop seat when lead becomes customer
async function decrementWorkshopSlot(lead: any) {
  try {
    if (!lead.workshopId) {
      console.log('[decrementWorkshopSlot] No workshopId on lead, skipping');
      return false;
    }

    const scheduleId = lead.workshopId.toString();
    
    // Find and decrement seat inventory
    const inventory = await WorkshopSeatInventory.findOneAndUpdate(
      { scheduleId, seatsRemaining: { $gt: 0 } },
      { $inc: { seatsRemaining: -1 }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    if (inventory) {
      console.log(`[decrementWorkshopSlot] Decremented seat for schedule ${scheduleId}. Remaining: ${inventory.seatsRemaining}`);
      return true;
    } else {
      console.log(`[decrementWorkshopSlot] No inventory found or no seats remaining for schedule ${scheduleId}`);
      return false;
    }
  } catch (error) {
    console.error('[decrementWorkshopSlot] Error:', error);
    return false;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.email !== undefined) update.email = String(body.email).trim();
    if (body.status !== undefined) update.status = String(body.status).trim();
    if (body.labels !== undefined) {
      update.labels = Array.isArray(body.labels) ? body.labels.map((x: any) => String(x)) : [];
    }
    if (body.workshopId !== undefined) update.workshopId = body.workshopId || null;
    if (body.workshopName !== undefined) update.workshopName = body.workshopName || null;
    if (body.metadata !== undefined) update.metadata = body.metadata;

    // Assignment is privileged: only super-admin can assign/unassign
    if (body.assignedToUserId !== undefined) {
      if (!superAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only super admin can assign leads' }, { status: 403 });
      }
      const raw = body.assignedToUserId;
      const next = raw === null || raw === '' ? null : String(raw).trim();
      update.assignedToUserId = next;
    }

    await connectDB();
    const existing: any = await Lead.findById(params.id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lead = await Lead.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // -- LOG CHANGES AS NOTES (SYSTEM HISTORY) --
    const notesToCreate: any[] = [];
    
    // 1. Status Change
    if (update.status && existing.status !== update.status) {
      notesToCreate.push({
        leadId: existing._id,
        note: `System: Status changed from "${existing.status}" to "${update.status}"`,
        createdByUserId: 'system',
        pinned: false,
      });

      // AUTO-ADD TO SALES: When status changes to 'customer', create a sale record
      if (update.status === 'customer' && existing.status !== 'customer') {
        const saleCreated = await autoAddToSales(existing, lead, viewerUserId);
        if (saleCreated) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Auto-added to Sales as customer converted`,
            createdByUserId: 'system',
            pinned: false,
          });
        }

        // DECREMENT WORKSHOP SLOT: When lead becomes customer, reduce available seats
        const slotDecremented = await decrementWorkshopSlot(lead);
        if (slotDecremented) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Workshop seat decremented (manual conversion)`,
            createdByUserId: 'system',
            pinned: false,
          });
        }
      }
    }

    // 2. Labels Change
    if (update.labels) {
       const oldLabels = (existing.labels || []).join(',');
       const newLabels = update.labels.join(',');
       if (oldLabels !== newLabels) {
          notesToCreate.push({
            leadId: existing._id,
            note: `System: Labels updated to: ${update.labels.join(', ')}`,
            createdByUserId: 'system',
            pinned: false
          });
       }
    }

    // 3. Assignment Change
    if (update.assignedToUserId !== undefined && existing.assignedToUserId !== update.assignedToUserId) {
       const newVal = update.assignedToUserId || 'Unassigned';
       notesToCreate.push({
          leadId: existing._id,
          note: `System: Re-assigned to user: ${newVal}`,
          createdByUserId: 'system',
          pinned: false
       });
    }

    if (notesToCreate.length > 0) {
       await LeadNote.insertMany(notesToCreate);
    }

    return NextResponse.json({ success: true, data: lead }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    await connectDB();

    const existing: any = await Lead.findById(params.id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!superAdmin && String(existing.assignedToUserId || '').trim() !== viewerUserId && String(existing.createdByUserId || '').trim() !== viewerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted: any = await Lead.findByIdAndDelete(params.id).lean();
    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Record deletion snapshot so deleted leadNumber remains visible in "Delete Record" view.
    try {
      await DeletedLead.create({
        leadId: deleted._id,
        leadNumber: (deleted as any)?.leadNumber,
        assignedToUserId: (deleted as any)?.assignedToUserId,
        createdByUserId: (deleted as any)?.createdByUserId,
        deletedByUserId: viewerUserId,
        name: (deleted as any)?.name,
        phoneNumber: (deleted as any)?.phoneNumber,
        email: (deleted as any)?.email,
        workshopName: (deleted as any)?.workshopName,
        status: (deleted as any)?.status,
        labels: Array.isArray((deleted as any)?.labels) ? (deleted as any).labels : [],
        source: (deleted as any)?.source,
        createdAtOriginal: (deleted as any)?.createdAt,
        updatedAtOriginal: (deleted as any)?.updatedAt,
        deletedAt: new Date(),
        metadata: (deleted as any)?.metadata,
      });
    } catch {
      // Non-fatal: deletion should succeed even if logging fails.
    }
    return NextResponse.json({ success: true, data: deleted }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
