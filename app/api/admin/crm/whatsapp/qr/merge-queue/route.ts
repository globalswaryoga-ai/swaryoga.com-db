/**
 * Safe Group Merge Queue API
 * Handles 1.5+ hour spreading with proper safety checks
 * Prevents WhatsApp bans from rapid group additions
 * 
 * Endpoints:
 * POST /api/admin/crm/whatsapp/qr/merge-queue - Create merge job
 * GET /api/admin/crm/whatsapp/qr/merge-queue/:queueId - Get status
 * POST /api/admin/crm/whatsapp/qr/merge-queue/:queueId/resume - Resume after disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';
import {

  createMergeQueueEntry,
  shouldProceedWithNextMergeOperation,
  formatMergeQueueProgress,
  resumeMergeQueue,
  blockMergeQueue,
  getNextMergeOperationDelay,
} from '@/lib/safeGroupMerge';

export const dynamic = 'force-dynamic';

const mergeQueueSchema = new mongoose.Schema({
  userId: String,
  sessionKey: String,
  targetGroupId: String,
  sourceGroupIds: [String],
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed', 'blocked'] },
  
  groupsProcessed: Number,
  totalGroups: Number,
  participantsAddedTotal: Number,
  participantsSkipped: Number,
  
  currentGroupIndex: Number,
  currentGroupId: String,
  currentBatchIndex: Number,
  currentBatchParticipants: [String],
  
  lastOperationTime: Date,
  nextOperationTime: Date,
  operationDelayMs: Number,
  connectionChecksPassed: Number,
  connectionChecksFailed: Number,
  
  lastError: String,
  errorCount: Number,
  autoSignoutDetected: Boolean,
  
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date,
  
  removeFromSource: Boolean,
  spreadMinutes: Number,
});

export const runtime = 'nodejs';

/**
 * POST /api/admin/crm/whatsapp/qr/merge-queue
 * Create a new merge job
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    
    await connectDB();
    const body = await request.json();
    const {
      targetGroupId,
      sourceGroupIds = [],
      removeFromSource = false,
      spreadMinutes = 90,
      sessionKey,
    } = body;
    
    if (!targetGroupId || sourceGroupIds.length === 0) {
      return NextResponse.json(
        { error: 'targetGroupId and sourceGroupIds required' },
        { status: 400 }
      );
    }
    
    // Create queue entry
    const queueEntry = createMergeQueueEntry(
      decoded.userId,
      sessionKey || decoded.userId,
      targetGroupId,
      sourceGroupIds,
      { removeFromSource, spreadMinutes }
    );
    
    const db = mongoose.connection.getClient().db('swaryoga_admin_crm');
    const col = db.collection('merge_queue');
    const result = await col.insertOne(queueEntry as any);
    
    return NextResponse.json({
      success: true,
      queueId: result.insertedId.toString(),
      message: `✅ Merge job created. Will process ${sourceGroupIds.length} groups over ~${spreadMinutes} minutes with safety delays.`,
      antiDetectionInfo: {
        spreadMinutes,
        expectedDuration: `${spreadMinutes} minutes+`,
        operationDelayRange: '30-120 seconds between each operation',
        strategy: 'Ultra-conservative to prevent WhatsApp ban',
        riskLevel: 'MINIMAL',
      },
      progress: formatMergeQueueProgress(queueEntry),
    });
  } catch (err) {
    console.error('[merge-queue] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/crm/whatsapp/qr/merge-queue/:queueId
 * Get merge job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { queueId?: string } }
) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    
    const queueId = request.nextUrl.searchParams.get('queueId');
    if (!queueId) {
      return NextResponse.json({ error: 'queueId required' }, { status: 400 });
    }
    
    await connectDB();
    const db = mongoose.connection.getClient().db('swaryoga_admin_crm');
    const col = db.collection('merge_queue');
    
    const queue = await col.findOne({
      _id: new mongoose.Types.ObjectId(queueId),
      userId: decoded.userId,
    });
    
    if (!queue) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      queue,
      progress: formatMergeQueueProgress(queue),
      nextCheckIn: Math.max(0, queue.nextOperationTime - Date.now()),
    });
  } catch (err) {
    console.error('[merge-queue] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/whatsapp/qr/merge-queue/:queueId/resume
 * Resume a paused merge after reconnection
 */
export async function putResumeQueue(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    
    const queueId = request.nextUrl.searchParams.get('queueId');
    if (!queueId) {
      return NextResponse.json({ error: 'queueId required' }, { status: 400 });
    }
    
    await connectDB();
    const db = mongoose.connection.getClient().db('swaryoga_admin_crm');
    const col = db.collection('merge_queue');
    
    const queue = await col.findOne({
      _id: new mongoose.Types.ObjectId(queueId),
      userId: decoded.userId,
    });
    
    if (!queue) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    
    // Resume the queue
    const resumed = resumeMergeQueue(queue);
    await col.updateOne(
      { _id: new mongoose.Types.ObjectId(queueId) },
      { $set: resumed }
    );
    
    return NextResponse.json({
      success: true,
      message: '✅ Merge resumed. Will continue with next operation in 30-120 seconds.',
      progress: formatMergeQueueProgress(resumed),
    });
  } catch (err) {
    console.error('[merge-queue] resume error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
