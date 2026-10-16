import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listWorkshopBatches,
  createWorkshopBatch,
  updateWorkshopBatch,
  deleteWorkshopBatch,
} from '@/lib/bunnyWorkshopScheduleRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workshops/batches (SUPERADMIN ONLY)
 * List batches for a workshop (BunnyDB)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const batches = await listWorkshopBatches(workshopId);

    return NextResponse.json({ success: true, batches });
  } catch (error: any) {
    console.error('[Batches API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/batches (SUPERADMIN ONLY)
 * Create a new batch for a workshop (BunnyDB)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { workshopId, batchNumber, name, startDate, endDate, isActive } = body;

    if (!workshopId || !batchNumber) {
      return NextResponse.json({ error: 'Workshop ID and batch number are required' }, { status: 400 });
    }

    const batch = await createWorkshopBatch({
      workshopId,
      batchNumber: Number(batchNumber),
      name,
      startDate,
      endDate,
      isActive,
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error('[Create Batch Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops/batches (SUPERADMIN ONLY)
 * Update a batch (BunnyDB)
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { batchId, ...updateData } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const batch = await updateWorkshopBatch(batchId, updateData);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error('[Update Batch Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops/batches
 * Delete a batch (BunnyDB)
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    await deleteWorkshopBatch(batchId);

    return NextResponse.json({ success: true, message: 'Batch deactivated' });
  } catch (error: any) {
    console.error('[Delete Batch Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
