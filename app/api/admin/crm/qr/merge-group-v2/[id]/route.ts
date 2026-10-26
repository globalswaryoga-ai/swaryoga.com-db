import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { formatMergeGroupV2Progress } from '@/lib/safeGroupMergeV2';
import {
  getMergeJobByIdBunny,
  updateMergeJobBunny,
} from '@/lib/bunnyGroupMergeRepository';

export const dynamic = 'force-dynamic';

/**
 * GET: Get merge operation details from Bunny Database
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const operation = await getMergeJobByIdBunny(params.id);

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    if (operation.userId !== decoded.userId && !decoded.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const progress = formatMergeGroupV2Progress(operation as any);

    return NextResponse.json({
      success: true,
      operation: {
        id: operation._id || operation.id,
        targetGroupId: operation.targetGroupId,
        totalParticipants: operation.totalOperations,
        ...progress,
        operationType: operation.operationType,
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
 * DELETE: Cancel merge operation in Bunny Database
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const operation = await getMergeJobByIdBunny(params.id);

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found' },
        { status: 404 }
      );
    }

    if (operation.userId !== decoded.userId && !decoded.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (operation.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed operation' },
        { status: 400 }
      );
    }

    await updateMergeJobBunny(params.id, { status: 'cancelled' });

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
