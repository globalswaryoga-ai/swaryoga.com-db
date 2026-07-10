import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import {
  createMergeGroupV2Entry,
  calculateGroupOperationGaps,
  validateGroupOperationCompliance,
  randomizeParticipantOrder,
} from '@/lib/safeGroupMergeV2';

export const dynamic = 'force-dynamic';

/**
 * POST: Create new merge group operation
 * Add 60 participants in hour 1, remove in hour 2
 */
export async function POST(req: NextRequest) {
  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    await connectDB();

    const body = await req.json();
    const { sessionKey, targetGroupId, participantIds, operationType } = body;

    // Validate input
    if (!sessionKey || !targetGroupId || !participantIds || !operationType) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionKey, targetGroupId, participantIds, operationType' },
        { status: 400 }
      );
    }

    if (!['add', 'remove'].includes(operationType)) {
      return NextResponse.json(
        { error: 'operationType must be "add" or "remove"' },
        { status: 400 }
      );
    }

    // Removing people from a merged group (and the auto-delete-when-empty
    // behavior that follows) is admin-only — team/non-admin logins must not
    // be able to shrink or disband a group.
    if (operationType === 'remove' && !decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Only an admin can remove participants from a merged group' },
        { status: 403 }
      );
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'participantIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate compliance (~15 ops/hr, spread over calculated hours)
    const spreadHours = Math.max(1, Math.ceil(participantIds.length / 15));
    const compliance = validateGroupOperationCompliance(participantIds.length, spreadHours);
    if (!compliance.valid) {
      return NextResponse.json(
        {
          error: 'Operation exceeds safety limits',
          details: compliance.errors,
          recommendation: compliance.recommendation,
        },
        { status: 400 }
      );
    }

    // Calculate gaps to show user
    const gaps = calculateGroupOperationGaps(participantIds.length);

    // Randomize participant order (human-like)
    const randomizedParticipants = randomizeParticipantOrder(participantIds);

    // Create entry
    const entry = createMergeGroupV2Entry(
      userId,
      sessionKey,
      targetGroupId,
      randomizedParticipants,
      operationType as 'add' | 'remove'
    );

    // Store in MongoDB
    const db = mongoose.connection.db!;
    const collection = db.collection('merge_group_v2_queue');

    const result = await collection.insertOne({
      ...entry,
      _id: undefined,
    });

    return NextResponse.json({
      success: true,
      jobId: result.insertedId.toString(),
      operation: operationType,
      totalParticipants: participantIds.length,
      estimatedDuration: gaps.totalMinutes,
      gapStrategy: gaps.strategy,
      compliance: {
        operationsPerHour: compliance.operationsPerHour,
        riskLevel: compliance.riskLevel,
        recommendation: compliance.recommendation,
      },
      message: `✅ ${operationType} operation scheduled: ${participantIds.length} participants over ~${gaps.totalMinutes} minutes`,
    });
  } catch (error) {
    console.error('[Merge Group V2] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: List all merge group operations for user
 */
export async function GET(req: NextRequest) {
  try {
    // Verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    await connectDB();

    const db = mongoose.connection.db!;
    const collection = db.collection('merge_group_v2_queue');

    const operations = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: operations.length,
      operations: operations.map((op) => ({
        id: op._id.toString(),
        operationType: op.operationType,
        status: op.status,
        targetGroupId: op.targetGroupId,
        totalParticipants: op.totalOperations,
        completed: op.completedOperations,
        failed: op.failedOperations,
        successRate:
          op.completedOperations + op.failedOperations > 0
            ? Math.round((op.completedOperations / (op.completedOperations + op.failedOperations)) * 100)
            : 0,
        groupDeleted: !!op.groupDeleted,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Merge Group V2] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
