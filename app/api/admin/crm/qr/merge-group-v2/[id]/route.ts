import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { formatMergeGroupV2Progress } from '@/lib/safeGroupMergeV2';

export const dynamic = 'force-dynamic';

/**
 * GET: Get merge operation details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    await connectDB();

    const db = (await import('@/lib/db')).getDb();
    const collection = db.collection('merge_group_v2_queue');

    const operation = await collection.findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    const progress = formatMergeGroupV2Progress(operation);

    return NextResponse.json({
      success: true,
      operation: {
        id: operation._id.toString(),
        operationType: operation.operationType,
        targetGroupId: operation.targetGroupId,
        totalParticipants: operation.totalOperations,
        ...progress,
        createdAt: operation.createdAt,
        updatedAt: operation.updatedAt,
        completedAt: operation.completedAt,
      },
    });
  } catch (error) {
    console.error('[Merge Group V2] GET Details Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Cancel merge operation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    await connectDB();

    const db = (await import('@/lib/db')).getDb();
    const collection = db.collection('merge_group_v2_queue');

    const operation = await collection.findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    if (operation.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed operation' },
        { status: 400 }
      );
    }

    // Mark as cancelled
    await collection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: '✅ Operation cancelled',
    });
  } catch (error) {
    console.error('[Merge Group V2] DELETE Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
