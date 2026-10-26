import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  createMergeGroupV2Entry,
  calculateGroupOperationGaps,
  validateGroupOperationCompliance,
  randomizeParticipantOrder,
} from '@/lib/safeGroupMergeV2';
import {
  createMergeJobBunny,
  listMergeJobsBunny,
} from '@/lib/bunnyGroupMergeRepository';

export const dynamic = 'force-dynamic';

/**
 * POST: Create new merge group operation in Bunny Database
 */
export async function POST(req: NextRequest) {
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

    const userId = (decoded.userId || decoded.username || 'admincrm') as string;

    const body = await req.json();
    const { sessionKey, targetGroupId, participantIds, operationType } = body;

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

    const gaps = calculateGroupOperationGaps(participantIds.length);
    const randomizedParticipants = randomizeParticipantOrder(participantIds);

    const entry = createMergeGroupV2Entry(
      userId,
      sessionKey,
      targetGroupId,
      randomizedParticipants,
      operationType as 'add' | 'remove'
    );

    const jobId = await createMergeJobBunny(entry);

    return NextResponse.json({
      success: true,
      jobId,
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
 * GET: List all merge group operations for user from Bunny Database
 */
export async function GET(req: NextRequest) {
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

    const userId = decoded.isAdmin ? undefined : (decoded.userId as string);
    const operations = await listMergeJobsBunny(userId);

    return NextResponse.json({
      success: true,
      count: operations.length,
      operations: operations.map((op) => ({
        id: op._id || op.id,
        operationType: op.operationType,
        status: op.status,
        targetGroupId: op.targetGroupId,
        totalParticipants: op.totalOperations,
        completed: op.completedOperations || 0,
        failed: op.failedOperations || 0,
        successRate:
          (op.completedOperations || 0) + (op.failedOperations || 0) > 0
            ? Math.round(((op.completedOperations || 0) / ((op.completedOperations || 0) + (op.failedOperations || 0))) * 100)
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
