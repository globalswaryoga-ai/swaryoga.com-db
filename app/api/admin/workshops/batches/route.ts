import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getBatch, getWorkshopVideo } from '@/lib/schemas/workshopSchemas';
import mongoose from 'mongoose';

/**
 * GET /api/admin/workshops/batches
 * List batches for a workshop
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Batch = getBatch();
    const WorkshopVideo = getWorkshopVideo();

    const { searchParams } = new URL(req.url);
    const workshopId = searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'Workshop ID is required' }, { status: 400 });
    }

    const batches = await Batch.find({ workshopId: new mongoose.Types.ObjectId(workshopId) })
      .sort({ batchNumber: -1 })
      .lean();

    // Enrich with video counts
    const enrichedBatches = await Promise.all(
      batches.map(async (batch: any) => {
        const videoCount = await WorkshopVideo.countDocuments({ batchId: batch._id });
        return { ...batch, videoCount };
      })
    );

    return NextResponse.json({ success: true, batches: enrichedBatches });
  } catch (error: any) {
    console.error('[Batches API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/batches
 * Create a new batch for a workshop
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Batch = getBatch();

    const body = await req.json();
    const { workshopId, batchNumber, name, startDate, endDate, isActive } = body;

    if (!workshopId || !batchNumber) {
      return NextResponse.json({ error: 'Workshop ID and batch number are required' }, { status: 400 });
    }

    // Check if batch number already exists for this workshop
    const existing = await Batch.findOne({ workshopId, batchNumber });
    if (existing) {
      return NextResponse.json({ error: 'Batch number already exists for this workshop' }, { status: 400 });
    }

    const batch = await Batch.create({
      workshopId: new mongoose.Types.ObjectId(workshopId),
      batchNumber,
      name: name || `Batch ${batchNumber}`,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: isActive !== false,
      enrolledUsers: [],
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    console.error('[Create Batch Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/workshops/batches
 * Update a batch
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Batch = getBatch();

    const body = await req.json();
    const { batchId, ...updateData } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Convert dates if provided
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const batch = await Batch.findByIdAndUpdate(
      batchId,
      { $set: updateData },
      { new: true }
    );

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
 * Delete a batch
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const decoded = verifyToken(authHeader);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const Batch = getBatch();

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    await Batch.findByIdAndUpdate(batchId, { isActive: false });

    return NextResponse.json({ success: true, message: 'Batch deactivated' });
  } catch (error: any) {
    console.error('[Delete Batch Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
