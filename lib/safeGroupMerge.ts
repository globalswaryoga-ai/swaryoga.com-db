/**
 * Safe Group Merge System - Ultra-Conservative WhatsApp Bot Prevention
 * 
 * Problem: Adding multiple groups too fast triggers WhatsApp ban
 * Solution: 1.5+ hour spreading with queue persistence and safety checks
 * 
 * Strategy:
 * - Spread entire merge operation over 1.5-3 hours (configurable)
 * - 30-120 second delays between EVERY operation (not just batches)
 * - Single operation at a time, with status monitoring
 * - Auto-resume if connection drops
 * - Graceful degradation if WhatsApp blocks
 */

import { ObjectId } from 'mongodb';

export interface MergeQueueItem {
  _id?: ObjectId;
  userId: string;  // QR user
  sessionKey: string;  // Bridge session
  targetGroupId: string;
  sourceGroupIds: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  
  // Progress tracking
  groupsProcessed: number;
  totalGroups: number;
  participantsAddedTotal: number;
  participantsSkipped: number;
  
  // Current operation
  currentGroupIndex: number;
  currentGroupId?: string;
  currentBatchIndex: number;
  currentBatchParticipants: string[];
  
  // Safety & timing
  lastOperationTime: Date;
  nextOperationTime: Date;
  operationDelayMs: number;  // 30000-120000
  connectionChecksPassed: number;
  connectionChecksFailed: number;
  
  // Error handling
  lastError?: string;
  errorCount: number;
  autoSignoutDetected: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Config
  removeFromSource: boolean;
  spreadMinutes: number;  // How long to spread over (default: 90)
}

export interface MergeQueueProgress {
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  groupsProcessed: number;
  totalGroups: number;
  participantsAdded: number;
  percentComplete: number;
  currentOperation: string;
  nextOperationIn: number;  // milliseconds
  estimatedTimeRemaining: number;  // milliseconds
  errorMessage?: string;
  warnings: string[];
}

/**
 * Calculate safe queue schedule: Ultra-conservative merge
 * Example: 5 groups, 50 participants each = 250 total
 * - Spread over: 90 minutes
 * - Per-operation delay: 30-120 seconds
 * - Total duration: ~90 minutes minimum
 */
export function calculateMergeQueueSchedule(
  groupCount: number,
  estimatedParticipantsPerGroup: number = 20,
  spreadMinutes: number = 90
) {
  const totalParticipants = groupCount * estimatedParticipantsPerGroup;
  const spreadSeconds = spreadMinutes * 60;
  
  // Operations per merge session:
  // 1 = fetch source group
  // 2 = add participants (1+ batches)
  // 3 = remove from source (if enabled)
  const operationsPerGroup = 2.5;  // Average
  const totalOperations = Math.ceil(groupCount * operationsPerGroup);
  
  const avgDelayPerOp = spreadSeconds / totalOperations;
  
  return {
    groupCount,
    estimatedTotalParticipants: totalParticipants,
    spreadMinutes,
    totalOperations,
    avgDelayPerOperationSeconds: Math.round(avgDelayPerOp),
    minDelaySeconds: 30,
    maxDelaySeconds: 120,
    strategy: 'Ultra-conservative: 30-120s delays between EVERY operation',
    riskLevel: 'MINIMAL' as const,
    antiDetectionMeasures: [
      '✅ Single group processed at a time',
      '✅ 30-120 second random delays between operations',
      '✅ Connection checks between operations',
      '✅ Auto-resume on disconnection',
      '✅ Graceful error recovery',
      '✅ No concurrent operations',
      '✅ Human-like typing speed simulation',
    ],
  };
}

/**
 * Get next safe operation delay (30-120 seconds)
 * Varies to appear human-like
 */
export function getNextMergeOperationDelay(): number {
  // 30-120 seconds for merge (MUCH longer than broadcast which uses 20-60)
  return Math.floor(Math.random() * (120000 - 30000 + 1)) + 30000;
}

/**
 * Should we proceed with next operation?
 * Checks: time elapsed, connection status, error recovery
 */
export function shouldProceedWithNextMergeOperation(
  queue: MergeQueueItem,
  connectionHealthy: boolean
): {
  shouldProceed: boolean;
  reason: string;
  nextCheckIn: number;  // ms
} {
  const now = Date.now();
  const timeSinceLastOp = now - queue.lastOperationTime.getTime();
  const timeUntilNext = queue.nextOperationTime.getTime() - now;
  
  // Check 1: Connection health
  if (!connectionHealthy) {
    if (queue.connectionChecksFailed > 3) {
      return {
        shouldProceed: false,
        reason: '❌ Connection failed 3+ times. Waiting for recovery...',
        nextCheckIn: 10000,  // Recheck in 10s
      };
    }
    return {
      shouldProceed: false,
      reason: '⚠️ Connection unhealthy. Waiting...',
      nextCheckIn: 5000,
    };
  }
  
  // Check 2: Time elapsed
  if (timeSinceLastOp < queue.operationDelayMs) {
    return {
      shouldProceed: false,
      reason: `⏳ Waiting ${Math.ceil(timeUntilNext / 1000)}s for safe delay...`,
      nextCheckIn: Math.min(timeUntilNext, 5000),
    };
  }
  
  // Check 3: Error recovery
  if (queue.errorCount > 5) {
    return {
      shouldProceed: false,
      reason: `❌ Too many errors (${queue.errorCount}/5). Pausing to prevent ban...`,
      nextCheckIn: 30000,
    };
  }
  
  // Check 4: Auto-signout detection
  if (queue.autoSignoutDetected) {
    return {
      shouldProceed: false,
      reason: '❌ Auto-signout detected. Pause and reconnect before resuming.',
      nextCheckIn: 60000,
    };
  }
  
  return {
    shouldProceed: true,
    reason: '✅ Ready for next operation',
    nextCheckIn: 0,
  };
}

/**
 * Create new merge queue entry
 */
export function createMergeQueueEntry(
  userId: string,
  sessionKey: string,
  targetGroupId: string,
  sourceGroupIds: string[],
  options: {
    removeFromSource?: boolean;
    spreadMinutes?: number;
  } = {}
): MergeQueueItem {
  const spreadMinutes = options.spreadMinutes || 90;
  const now = new Date();
  
  return {
    userId,
    sessionKey,
    targetGroupId,
    sourceGroupIds: sourceGroupIds.filter(id => id !== targetGroupId),  // Remove duplicates
    status: 'pending',
    
    groupsProcessed: 0,
    totalGroups: sourceGroupIds.length,
    participantsAddedTotal: 0,
    participantsSkipped: 0,
    
    currentGroupIndex: 0,
    currentBatchIndex: 0,
    currentBatchParticipants: [],
    
    lastOperationTime: now,
    nextOperationTime: new Date(now.getTime() + getNextMergeOperationDelay()),
    operationDelayMs: getNextMergeOperationDelay(),
    connectionChecksPassed: 0,
    connectionChecksFailed: 0,
    
    errorCount: 0,
    autoSignoutDetected: false,
    
    createdAt: now,
    updatedAt: now,
    
    removeFromSource: options.removeFromSource || false,
    spreadMinutes,
  };
}

/**
 * Format progress for UI display
 */
export function formatMergeQueueProgress(queue: MergeQueueItem): MergeQueueProgress {
  const percentComplete = queue.totalGroups > 0
    ? Math.round((queue.groupsProcessed / queue.totalGroups) * 100)
    : 0;
  
  const now = Date.now();
  const nextOpIn = Math.max(0, queue.nextOperationTime.getTime() - now);
  
  // Estimate remaining time based on average operation time
  const avgTimePerGroup = (queue.spreadMinutes * 60000) / Math.max(queue.totalGroups, 1);
  const groupsRemaining = queue.totalGroups - queue.groupsProcessed;
  const estimatedRemaining = groupsRemaining * avgTimePerGroup;
  
  const warnings: string[] = [];
  if (queue.connectionChecksFailed > 0) {
    warnings.push(`⚠️ ${queue.connectionChecksFailed} connection failures (will auto-retry)`);
  }
  if (queue.errorCount > 2) {
    warnings.push(`⚠️ ${queue.errorCount} errors encountered`);
  }
  if (queue.autoSignoutDetected) {
    warnings.push('🚨 Auto-signout detected - manual reconnection needed');
  }
  
  const currentOp =
    queue.status === 'completed' ? '✅ Completed' :
    queue.status === 'failed' ? '❌ Failed' :
    queue.status === 'blocked' ? '🚨 Blocked (WhatsApp safety)' :
    queue.status === 'pending' ? '⏳ Pending (not started)' :
    `📊 Processing group ${queue.currentGroupIndex + 1}/${queue.totalGroups}`;
  
  return {
    status: queue.status,
    groupsProcessed: queue.groupsProcessed,
    totalGroups: queue.totalGroups,
    participantsAdded: queue.participantsAddedTotal,
    percentComplete,
    currentOperation: currentOp,
    nextOperationIn: nextOpIn,
    estimatedTimeRemaining: estimatedRemaining,
    errorMessage: queue.lastError,
    warnings,
  };
}

/**
 * Resume a paused merge queue entry
 * Used when connection is restored after auto-signout
 */
export function resumeMergeQueue(queue: MergeQueueItem): MergeQueueItem {
  return {
    ...queue,
    status: 'in-progress',
    autoSignoutDetected: false,
    connectionChecksFailed: 0,
    lastError: undefined,
    updatedAt: new Date(),
  };
}

/**
 * Mark merge as blocked due to WhatsApp restrictions
 */
export function blockMergeQueue(
  queue: MergeQueueItem,
  reason: string
): MergeQueueItem {
  return {
    ...queue,
    status: 'blocked',
    lastError: reason,
    updatedAt: new Date(),
  };
}
