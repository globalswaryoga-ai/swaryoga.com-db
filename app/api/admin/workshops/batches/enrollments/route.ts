import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import { getBatch, getWorkshop } from '@/lib/schemas/workshopSchemas';
import mongoose from 'mongoose';

/**
 * GET /api/admin/workshops/batches/enrollments
 * Get enrollments for a batch
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

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const batch = await Batch.findById(batchId)
      .populate('enrolledUsers', 'name email phone')
      .lean();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: batch._id,
        name: batch.name,
        batchNumber: batch.batchNumber,
      },
      enrollments: batch.enrolledUsers || [],
      totalEnrolled: (batch.enrolledUsers || []).length,
    });
  } catch (error: any) {
    console.error('[Get Enrollments Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/workshops/batches/enrollments
 * Add user(s) to a batch
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
    const { batchId, userIds } = body;

    if (!batchId || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Batch ID and user IDs array are required' },
        { status: 400 }
      );
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Add users to enrolled list (avoiding duplicates)
    const existingUserIds = batch.enrolledUsers.map((id: any) => id.toString());
    const newUserIds = userIds.filter((id: string) => !existingUserIds.includes(id));

    await Batch.findByIdAndUpdate(batchId, {
      $addToSet: {
        enrolledUsers: {
          $each: newUserIds.map((id: string) => new mongoose.Types.ObjectId(id)),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${newUserIds.length} user(s) enrolled`,
      addedCount: newUserIds.length,
      skippedCount: userIds.length - newUserIds.length,
    });
  } catch (error: any) {
    console.error('[Add Enrollments Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/workshops/batches/enrollments
 * Remove user(s) from a batch
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
    const userId = searchParams.get('userId');

    if (!batchId || !userId) {
      return NextResponse.json({ error: 'Batch ID and user ID are required' }, { status: 400 });
    }

    await Batch.findByIdAndUpdate(batchId, {
      $pull: {
        enrolledUsers: new mongoose.Types.ObjectId(userId),
      },
    });

    return NextResponse.json({ success: true, message: 'User removed from batch' });
  } catch (error: any) {
    console.error('[Remove Enrollment Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
