/**
 * Safe Group Merge V2 - WhatsApp Compliant Group Operations
 *
 * Problem: Group add/remove operations banned despite conservative delays
 * Root cause: Group modifications have stricter rate limits than messages
 * Solution: Variable gaps (no repeats) + compliance checking + failure monitoring
 *
 * Strategy:
 * - First 2 operations: 30 second warm-up
 * - Rest: random 3-7 minute gaps, no repeats (human-like, non-robotic)
 * - Randomize processing order (group order, participant order)
 * - Stop if 20%+ operations fail (prevent cascading bans)
 * - Check compliance before each operation
 */

interface MergeGroupV2Item {
  _id?: string;
  userId: string;
  sessionKey: string;
  targetGroupId: string;
  participantIds: string[];

  // Operation type
  operationType: 'add' | 'remove';

  // Progress tracking
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  skippedOperations: number;

  // Current operation
  currentParticipantIndex: number;
  currentParticipantId?: string;
  // Transient-failure retries used on the current participant (reset on advance)
  currentRetryCount?: number;

  // Safety & timing
  lastOperationTime: Date;
  nextOperationTime: Date;
  operationDelayMs: number;

  // Error handling
  lastError?: string;
  errorLog: Array<{ participantId: string; error: string; timestamp: Date }>;

  // Status
  status: 'pending' | 'in-progress' | 'paused' | 'completed' | 'failed' | 'blocked' | 'cancelled';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface MergeOperationGaps {
  gaps: number[];
  totalMs: number;
  totalMinutes: string;
  strategy: string;
}

/**
 * Calculate variable gaps for group operations (~9/hour, matches QR send pace)
 * Pattern:
 * - Operations 1-2: 30 second warm-up
 * - Operations 3+: Random 180-420 second gaps (3–7 min, ~9/hr)
 * - No repeated gaps (ensures human-like, non-robotic behavior)
 */
export function calculateGroupOperationGaps(totalOperations: number): MergeOperationGaps {
  const gaps: number[] = [];
  let lastGap: number | null = null;

  for (let i = 0; i < totalOperations - 1; i++) {
    let gap: number;

    if (i < 2) {
      // First 2 operations: 30 second warm-up
      gap = 30000;
    } else {
      // Rest: Random 180-420 second gaps (3–7 min, ~9/hr — non-robotic)
      let attempts = 0;
      do {
        gap = Math.random() * (420000 - 180000) + 180000;
        attempts++;
      } while (gap === lastGap && attempts < 10);
    }

    gaps.push(gap);
    lastGap = gap;
  }

  const totalMs = gaps.reduce((a, b) => a + b, 0);
  const totalMinutes = (totalMs / 60000).toFixed(1);

  return {
    gaps,
    totalMs,
    totalMinutes,
    strategy: `First 2: 30s | Rest: 3–7 min random (no repeats) | Total: ~${totalMinutes}min for ${totalOperations} operations`,
  };
}

/**
 * Validate group operation compliance with WhatsApp safety rules
 */
export function validateGroupOperationCompliance(
  totalOperations: number,
  hoursToSpread: number
): {
  valid: boolean;
  operationsPerHour: number;
  riskLevel: string;
  recommendation: string;
  errors: string[];
} {
  const operationsPerHour = totalOperations / hoursToSpread;
  const errors: string[] = [];

  // Group operations are stricter than messages - max 60/hour
  if (operationsPerHour > 60) {
    errors.push(`❌ Too fast: ${Math.round(operationsPerHour)} ops/hour. Max safe: 60/hour`);
  }

  if (operationsPerHour > 45) {
    errors.push(`⚠️  Caution: ${Math.round(operationsPerHour)} ops/hour. Monitor for blocks.`);
  }

  let riskLevel = '🟢 SAFE';
  let recommendation = '✅ This operation rate is safe for group modifications';

  if (operationsPerHour > 60) {
    riskLevel = '🔴 DANGER';
    recommendation = '❌ Too fast. Increase spread time or reduce participants.';
  } else if (operationsPerHour > 45) {
    riskLevel = '🟡 CAUTION';
    recommendation = '⚠️  Monitor failure rates. Group ops are stricter than messages.';
  }

  return {
    valid: errors.length === 0,
    operationsPerHour: Math.round(operationsPerHour),
    riskLevel,
    recommendation,
    errors,
  };
}

/**
 * Create merge group V2 entry
 */
export function createMergeGroupV2Entry(
  userId: string,
  sessionKey: string,
  targetGroupId: string,
  participantIds: string[],
  operationType: 'add' | 'remove'
): MergeGroupV2Item {
  const now = new Date();
  const { gaps } = calculateGroupOperationGaps(participantIds.length);

  return {
    userId,
    sessionKey,
    targetGroupId,
    participantIds,
    operationType,

    totalOperations: participantIds.length,
    completedOperations: 0,
    failedOperations: 0,
    skippedOperations: 0,

    currentParticipantIndex: 0,
    currentRetryCount: 0,

    lastOperationTime: now,
    nextOperationTime: new Date(now.getTime() + gaps[0]),
    operationDelayMs: gaps[0],

    lastError: undefined,
    errorLog: [],

    status: 'pending',

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculate next gap for group operation
 * Ensures: no repeated gaps, randomized within range
 */
export function getNextGroupOperationGap(operationIndex: number, lastGap?: number): number {
  if (operationIndex < 2) {
    return 30000; // First 2 operations: 30s warm-up
  }

  let gap: number;
  let attempts = 0;

  do {
    // 180–420s random (mean 300s = 5 min) → ~9 operations/hour, non-robotic.
    // No repeated gaps keeps it human/non-robotic.
    gap = Math.random() * (420000 - 180000) + 180000;
    attempts++;
  } while (lastGap && gap === lastGap && attempts < 10);

  return gap;
}

/**
 * Format progress for display
 */
export function formatMergeGroupV2Progress(item: MergeGroupV2Item) {
  const percentComplete = Math.round((item.completedOperations / item.totalOperations) * 100);
  const successRate =
    item.completedOperations + item.failedOperations > 0
      ? Math.round((item.completedOperations / (item.completedOperations + item.failedOperations)) * 100)
      : 0;

  const now = Date.now();
  const nextOpIn = Math.max(0, item.nextOperationTime.getTime() - now);

  const statusText =
    item.status === 'completed' ? '✅ Completed' :
    item.status === 'failed' ? '❌ Failed' :
    item.status === 'blocked' ? '🚨 Blocked' :
    item.status === 'pending' ? '⏳ Pending' :
    `📊 Processing ${item.operationType} (${item.completedOperations + 1}/${item.totalOperations})`;

  return {
    status: item.status,
    operationType: item.operationType,
    percentComplete,
    completed: item.completedOperations,
    failed: item.failedOperations,
    skipped: item.skippedOperations,
    total: item.totalOperations,
    successRate,
    statusText,
    nextOperationIn: nextOpIn,
    errorMessage: item.lastError,
    lastError: item.errorLog.length > 0 ? item.errorLog[item.errorLog.length - 1] : null,
  };
}

/**
 * Randomize participant processing order
 */
export function randomizeParticipantOrder(participantIds: string[]): string[] {
  const shuffled = [...participantIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if operation rate exceeds safety threshold
 */
export function shouldStopDueToFailureRate(failedCount: number, totalCount: number): boolean {
  if (totalCount < 5) return false; // Allow first 5 to fail
  const failureRate = failedCount / totalCount;
  return failureRate > 0.2; // Stop if 20%+ fail
}

/**
 * Add error to log
 */
export function addErrorToLog(
  item: MergeGroupV2Item,
  participantId: string,
  error: string
): MergeGroupV2Item {
  return {
    ...item,
    errorLog: [
      ...item.errorLog,
      {
        participantId,
        error,
        timestamp: new Date(),
      },
    ],
    lastError: error,
  };
}
