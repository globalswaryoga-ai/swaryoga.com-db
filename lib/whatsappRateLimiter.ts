/**
 * WhatsApp Rate Limiting Helper
 * Ensures human-like behavior to avoid spam detection and account bans
 * 
 * Strategy:
 * - Random batch sizes (3-6 numbers per batch)
 * - Random delays between batches (20-60 seconds)
 * - Randomize order of operations
 * - Take admin number last (cleanup)
 * - Target: 100 numbers = ~10 minutes minimum
 */

/**
 * Generate random delay in milliseconds
 * Range: 20-60 seconds (1200-3600ms)
 */
export function getRandomDelay(): number {
  const minMs = 20000;  // 20 seconds
  const maxMs = 60000;  // 60 seconds
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Generate random batch size
 * Range: 3-6 numbers per batch (human-like speed)
 */
export function getRandomBatchSize(): number {
  const minSize = 3;
  const maxSize = 6;
  return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}

/**
 * Calculate total expected time for N numbers
 * Returns { batches, estimatedSeconds, estimatedMinutes }
 */
export function calculateRateLimitTiming(totalNumbers: number): {
  batches: number;
  estimatedSeconds: number;
  estimatedMinutes: string;
} {
  const avgBatchSize = 4.5; // Average of 3-6
  const avgDelaySeconds = 40; // Average of 20-60
  
  const batches = Math.ceil(totalNumbers / avgBatchSize);
  const estimatedSeconds = batches * avgDelaySeconds;
  const estimatedMinutes = (estimatedSeconds / 60).toFixed(1);
  
  return { batches, estimatedSeconds, estimatedMinutes };
}

/**
 * Shuffle array randomly (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Separate admin numbers from regular numbers
 * Returns: { regularNumbers, adminNumbers }
 */
export function separateAdminNumbers(
  numbers: string[],
  adminIndicators: string[] = [] // List of phone numbers that are admins
): { regularNumbers: string[]; adminNumbers: string[] } {
  const adminNumbers: string[] = [];
  const regularNumbers: string[] = [];
  
  for (const num of numbers) {
    if (adminIndicators.includes(num)) {
      adminNumbers.push(num);
    } else {
      regularNumbers.push(num);
    }
  }
  
  return { regularNumbers, adminNumbers };
}

/**
 * Generate batch sequence with human-like randomization
 * Example: [5, 4, 6, 3, 5, ...] for 100 numbers
 */
export function generateBatchSequence(
  totalNumbers: number,
  minBatchSize: number = 3,
  maxBatchSize: number = 6
): number[] {
  const batches: number[] = [];
  let remaining = totalNumbers;
  
  while (remaining > 0) {
    const batchSize = Math.min(
      Math.floor(Math.random() * (maxBatchSize - minBatchSize + 1)) + minBatchSize,
      remaining
    );
    batches.push(batchSize);
    remaining -= batchSize;
  }
  
  return batches;
}

/**
 * Sleep with jitter to avoid predictable timing
 */
export async function sleepWithJitter(baseMs: number, jitterPercent: number = 15): Promise<void> {
  const jitterMs = baseMs * (jitterPercent / 100);
  const actualDelay = baseMs + (Math.random() * jitterMs * 2 - jitterMs);
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

/**
 * Add batch with rate limiting
 * Ensures: random batch size, random delay, no fixed patterns
 */
export async function addBatchWithRateLimit(
  addBatchFn: (batch: string[]) => Promise<void>,
  numbers: string[],
  progressCallback?: (status: string, progress: number, total: number) => void
): Promise<{ added: number; failed: number }> {
  let added = 0;
  let failed = 0;
  
  const batchSequence = generateBatchSequence(numbers.length);
  let numberIndex = 0;
  
  for (let batchNum = 0; batchNum < batchSequence.length; batchNum++) {
    const batchSize = batchSequence[batchNum];
    const batch = numbers.slice(numberIndex, numberIndex + batchSize);
    numberIndex += batchSize;
    
    // Report progress
    if (progressCallback) {
      const totalProcessed = added + failed;
      progressCallback(
        `Adding batch ${batchNum + 1}/${batchSequence.length} (${batch.length} numbers)...`,
        totalProcessed,
        numbers.length
      );
    }
    
    try {
      await addBatchFn(batch);
      added += batch.length;
    } catch (err) {
      console.error(`Batch ${batchNum + 1} failed:`, err);
      failed += batch.length;
    }
    
    // Random delay between batches (except last batch)
    if (batchNum < batchSequence.length - 1) {
      const delay = getRandomDelay();
      const delaySeconds = (delay / 1000).toFixed(1);
      if (progressCallback) {
        progressCallback(
          `Waiting ${delaySeconds}s before next batch... (anti-spam)`,
          added + failed,
          numbers.length
        );
      }
      await sleepWithJitter(delay, 10); // 10% jitter
    }
  }
  
  return { added, failed };
}

/**
 * Calculate minimum time needed for N operations
 * For 100 numbers: ~10 minutes
 */
export function getMinimumOperationTime(operationCount: number): string {
  const avgBatchSize = 4.5;
  const avgDelaySeconds = 40;
  
  const batches = Math.ceil(operationCount / avgBatchSize);
  const totalSeconds = batches * avgDelaySeconds;
  
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)} seconds`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/**
 * Calculate an hourly broadcast schedule that spreads messages evenly
 * Perfect for: 100 messages over 10 hours (1 message every 6 minutes on average)
 * 
 * Function applies:
 * - Randomized batch sizes (3-6 per batch)
 * - Randomized delays between batches (20-60 seconds)
 * - Even distribution across time window to avoid patterns
 * 
 * @param totalMessages Total number of messages to send
 * @param spreadHours Number of hours to spread over (default: 10)
 * @returns Schedule object with batch timings
 */
export function calculateHourlyBroadcastSchedule(totalMessages: number, spreadHours: number = 10) {
  const spreadSeconds = spreadHours * 3600; // Convert hours to seconds
  const now = Date.now();
  
  // Generate random batch sizes (3-6 per batch)
  const batches: Array<{ size: number; delaySeconds: number; startTime: Date }> = [];
  let remaining = totalMessages;
  let cumulativeSeconds = 0;
  
  while (remaining > 0) {
    // Random batch size 3-6, but ensure we don't exceed total
    const batchSize = Math.min(getRandomBatchSize(), remaining);
    
    // Calculate delay until this batch should be sent
    // Spread batches evenly: if spreadHours = 10, each message gets ~6min slot
    // Apply randomization so it looks human-like
    const avgSecondsPerMessage = spreadSeconds / totalMessages;
    const batchSeconds = batchSize * avgSecondsPerMessage;
    const randomJitter = (Math.random() * 0.3 - 0.15) * batchSeconds; // ±15% jitter
    const delaySeconds = Math.max(20, batchSeconds + randomJitter); // Min 20 sec
    
    cumulativeSeconds += delaySeconds;
    
    batches.push({
      size: batchSize,
      delaySeconds: Math.floor(delaySeconds),
      startTime: new Date(now + cumulativeSeconds * 1000),
    });
    
    remaining -= batchSize;
  }
  
  return {
    batches,
    totalBatches: batches.length,
    totalMessages,
    spreadHours,
    totalDurationSeconds: Math.ceil(cumulativeSeconds),
    totalDurationMinutes: Math.ceil(cumulativeSeconds / 60),
    scheduleStartTime: new Date(now),
    scheduleEndTime: new Date(now + cumulativeSeconds * 1000),
    antiSpamNote: `Randomized ${batches.length} batches (3-6 per batch) over ${spreadHours} hours`,
  };
}

/**
 * Format schedule for human display
 */
export function formatBroadcastSchedule(schedule: ReturnType<typeof calculateHourlyBroadcastSchedule>): string {
  const startTime = schedule.scheduleStartTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  const endTime = schedule.scheduleEndTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  return `📅 Broadcast Schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Messages: ${schedule.totalMessages}
✓ Duration: ~${schedule.totalDurationMinutes} min (${Math.ceil(schedule.totalDurationMinutes / 60)}h ${schedule.totalDurationMinutes % 60}m)
✓ Batches: ${schedule.totalBatches} batches (3-6 per batch)
✓ Start: ${startTime}
✓ End: ${endTime}
✓ Strategy: Random delays 20-60sec between batches
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Calculate 1.5-hour merge schedule for group participant addition
 * Ultra-conservative timing: ~1 participant per 54 seconds
 * 
 * Example: 100 participants over 90 minutes
 * - Returns: ~18 batches (5-6 per batch)
 * - Delays: 30-120 seconds between batches (MUCH longer than broadcast)
 * - Strategy: Extremely slow to avoid WhatsApp spam detection
 * - Risk Level: MINIMAL (slowest possible without being suspicious)
 * 
 * @param totalParticipants Total participants to add
 * @param spreadMinutes Number of minutes to spread over (default: 90 for 1.5 hours)
 * @returns Schedule with human-like timing
 */
export function calculateMergeGroupSchedule(totalParticipants: number, spreadMinutes: number = 240) {
  const spreadSeconds = spreadMinutes * 60;
  const now = Date.now();
  
  // OPTION B: ULTRA-CONSERVATIVE MERGE - Makes merge look 100% human, NOT bot
  // - Micro-batch sizes (2-3) - real humans add 1-3 at a time
  // - Long delays (60-180 sec = 1-3 min) - realistic human pacing between actions
  // - 240+ min spread (4+ hours) - realistic for merging 5 groups or 100+ people
  // Risk of WhatsApp ban: NEARLY ZERO
  const batches: Array<{ size: number; delaySeconds: number; startTime: Date }> = [];
  let remaining = totalParticipants;
  let cumulativeSeconds = 0;
  
  while (remaining > 0) {
    // OPTION B: 2-3 per batch (micro-batch, very human-like)
    const batchSize = Math.min(
      Math.floor(Math.random() * 2) + 2, // 2-3 only
      remaining
    );
    
    // OPTION B: 60-180 seconds delay (1-3 minutes between each batch)
    const delayMs = Math.floor(Math.random() * (180000 - 60000 + 1)) + 60000; // 60-180 sec
    const delaySeconds = delayMs / 1000;
    
    cumulativeSeconds += delaySeconds;
    
    batches.push({
      size: batchSize,
      delaySeconds: Math.floor(delaySeconds),
      startTime: new Date(now + cumulativeSeconds * 1000),
    });
    
    remaining -= batchSize;
  }
  
  return {
    batches,
    totalBatches: batches.length,
    totalParticipants,
    spreadMinutes,
    totalDurationSeconds: Math.ceil(cumulativeSeconds),
    totalDurationMinutes: Math.ceil(cumulativeSeconds / 60),
    scheduleStartTime: new Date(now),
    scheduleEndTime: new Date(now + cumulativeSeconds * 1000),
    antiSpamNote: `🔥 OPTION B ULTRA-SAFE: ${batches.length} micro-batches (2-3 per batch) with 60-180sec delays (1-3 min between each) = ${Math.ceil(cumulativeSeconds / 60)}+ minutes = Completely HUMAN-LIKE`,
    riskLevel: 'NEARLY_ZERO' as const,
  };
}

/**
 * Get random delay for MERGE operations - OPTION B ULTRA-CONSERVATIVE
 * Range: 60-180 seconds (1-3 minutes between each micro-batch)
 * Makes it look like a human slowly, methodically adding people
 */
export function getRandomMergeDelay(): number {
  const minMs = 60000;  // 60 seconds (1 minute minimum)
  const maxMs = 180000; // 180 seconds (3 minutes maximum)
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Get random batch size for MERGE operations - OPTION B ULTRA-CONSERVATIVE
 * Range: 2-3 participants per batch (micro-batches look incredibly human)
 * A normal human adds one or two people at a time, not 5-8 in rapid succession
 */
export function getRandomMergeBatchSize(): number {
  const minSize = 2;
  const maxSize = 3;
  return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}

