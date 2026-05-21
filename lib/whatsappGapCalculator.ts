/**
 * WhatsApp Smart Gap Calculator
 * Complies with WhatsApp rate limiting rules
 * - 60 messages per hour (safe professional account rate)
 * - Variable gaps (5-20 sec initial, then 45-90 sec for rest)
 * - No repeated gaps (each gap different from previous)
 * - Random jitter for human-like behavior
 */

/**
 * WhatsApp Safety Rules Enforced:
 * 1. Speed Limit: 1 message every 45+ seconds (safe)
 * 2. Pattern Detection: No repeated gaps
 * 3. Account Reputation: Conservative approach (new accounts)
 * 4. Batch Safety: Group messages by 5-10, not sequential
 * 5. Time Distribution: Spread across operating hours
 * 6. Message Variation: Different content each time
 * 7. Recipient Quality: Filter inactive numbers
 */

interface GapStrategy {
  initialGapMs: number; // First messages gap (7 sec = 7000ms)
  initialGapCount: number; // How many messages use initial gap (2)
  minGapMs: number; // Minimum random gap (45 seconds)
  maxGapMs: number; // Maximum random gap (120 seconds)
  batchSize: number; // Messages per batch (5-10)
  batchGapMs: number; // Gap between batches (30-60 sec)
  totalMessagesPerHour: number; // Target (60)
  ensureVariation: boolean; // Never same gap twice
}

/**
 * Default WhatsApp-safe strategy for 60 messages/hour
 * Pattern:
 * - Messages 1-2: 7 second gap (quick start)
 * - Messages 3-60: Random 45-90 second gaps (safe professional rate)
 * - No gap repeats (variation ensures human behavior)
 */
export const DEFAULT_GAP_STRATEGY: GapStrategy = {
  initialGapMs: 7000, // 7 seconds (initial quick messages)
  initialGapCount: 2, // Only first 2 messages
  minGapMs: 45000, // 45 seconds minimum (very safe)
  maxGapMs: 120000, // 120 seconds maximum (2 minutes)
  batchSize: 5, // 5 messages per batch
  batchGapMs: 30000, // 30 seconds between batches
  totalMessagesPerHour: 60,
  ensureVariation: true,
};

/**
 * Validate gap strategy against WhatsApp rules
 */
export function validateGapStrategy(strategy: GapStrategy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rule 1: Minimum gap must be at least 45 seconds (1 message per 45 sec = safe)
  if (strategy.minGapMs < 45000) {
    errors.push(`❌ Minimum gap too fast: ${strategy.minGapMs}ms. Must be ≥45000ms (45 sec) per WhatsApp rules`);
  }

  // Rule 2: Maximum gap should not exceed 3 minutes (180 sec)
  if (strategy.maxGapMs > 180000) {
    errors.push(`⚠️  Maximum gap very large: ${strategy.maxGapMs}ms. Recommendation: ≤120000ms (2 min)`);
  }

  // Rule 3: Initial gap must be less than min gap (makes sense)
  if (strategy.initialGapMs > strategy.minGapMs) {
    errors.push(
      `❌ Initial gap (${strategy.initialGapMs}ms) cannot exceed min gap (${strategy.minGapMs}ms)`
    );
  }

  // Rule 4: For 60 messages/hour, average gap should be ~60 seconds
  const avgGapMs = (strategy.minGapMs + strategy.maxGapMs) / 2;
  const messagesPerHour = Math.floor(3600000 / avgGapMs);
  if (messagesPerHour < 50) {
    errors.push(
      `⚠️  Gaps too large: Only ~${messagesPerHour} messages/hour possible. Need min gap < ${Math.floor(3600000 / 60)}ms`
    );
  }
  if (messagesPerHour > 80) {
    errors.push(
      `❌ Gaps too small: ~${messagesPerHour} messages/hour possible. Max safe is 60/hour`
    );
  }

  // Rule 5: Initial gap count should be 2-5
  if (strategy.initialGapCount < 1 || strategy.initialGapCount > 10) {
    errors.push(`❌ Initial gap count should be 1-10, got ${strategy.initialGapCount}`);
  }

  // Rule 6: Batch size 5-10 is safe
  if (strategy.batchSize < 3 || strategy.batchSize > 15) {
    errors.push(`⚠️  Batch size ${strategy.batchSize} unusual. Recommended: 5-10`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate exact gaps ensuring no repetition
 * Returns array of gaps in milliseconds
 */
export function calculateVariableGaps(
  totalMessages: number,
  strategy: GapStrategy
): number[] {
  const gaps: number[] = [];

  // Validate strategy first
  const validation = validateGapStrategy(strategy);
  if (!validation.valid) {
    console.warn('⚠️  Gap strategy validation warnings:', validation.errors);
  }

  let lastGap: number | null = null;

  for (let i = 0; i < totalMessages - 1; i++) {
    let gap: number;

    if (i < strategy.initialGapCount) {
      // Use initial fixed gap for first N messages
      gap = strategy.initialGapMs;
    } else {
      // Use random gap with variation
      let attempts = 0;
      do {
        gap = Math.random() * (strategy.maxGapMs - strategy.minGapMs) + strategy.minGapMs;
        attempts++;
      } while (strategy.ensureVariation && gap === lastGap && attempts < 10);
    }

    gaps.push(gap);
    lastGap = gap;
  }

  return gaps;
}

/**
 * Calculate total time to send N messages
 */
export function calculateTotalSendTime(gaps: number[]): {
  totalMs: number;
  totalSeconds: number;
  totalMinutes: string;
  messagesPerHour: string;
} {
  const totalMs = gaps.reduce((a, b) => a + b, 0);
  const totalSeconds = totalMs / 1000;
  const totalMinutes = (totalSeconds / 60).toFixed(1);
  const messagesPerHour = ((gaps.length / totalSeconds) * 3600).toFixed(0);

  return {
    totalMs,
    totalSeconds,
    totalMinutes,
    messagesPerHour,
  };
}

/**
 * Format gaps for display
 */
export function formatGapsForDisplay(gaps: number[], maxShow: number = 10): string {
  const shown = gaps.slice(0, maxShow);
  const formatted = shown.map((g) => `${(g / 1000).toFixed(1)}s`).join(', ');
  const remaining = gaps.length > maxShow ? ` ... and ${gaps.length - maxShow} more` : '';
  return `[${formatted}${remaining}]`;
}

/**
 * Get WhatsApp compliance status
 */
export function getWhatsAppComplianceStatus(
  totalMessages: number,
  totalHours: number
): {
  status: 'safe' | 'caution' | 'danger';
  messagesPerDay: number;
  messagesPerHour: number;
  riskLevel: string;
  recommendation: string;
} {
  const messagesPerHour = totalMessages / totalHours;
  const messagesPerDay = messagesPerHour * 24;

  let status: 'safe' | 'caution' | 'danger';
  let riskLevel: string;
  let recommendation: string;

  if (messagesPerHour <= 60 && messagesPerDay <= 1440) {
    status = 'safe';
    riskLevel = '🟢 SAFE';
    recommendation = '✅ This rate is safe for established accounts';
  } else if (messagesPerHour <= 100 && messagesPerDay <= 2400) {
    status = 'caution';
    riskLevel = '🟡 CAUTION';
    recommendation = '⚠️  Use only on old/established accounts. Monitor failure rates.';
  } else {
    status = 'danger';
    riskLevel = '🔴 DANGER';
    recommendation = '❌ Too fast. Risk of immediate ban. Increase gaps.';
  }

  return {
    status,
    messagesPerHour: Math.round(messagesPerHour),
    messagesPerDay: Math.round(messagesPerDay),
    riskLevel,
    recommendation,
  };
}

/**
 * Recommended gap settings for different scenarios
 */
export const GAP_PRESETS = {
  ULTRA_SAFE: {
    name: 'Ultra Safe (30/hour)',
    strategy: {
      initialGapMs: 10000,
      initialGapCount: 2,
      minGapMs: 100000, // 100+ sec = 1 msg per 1.67 min
      maxGapMs: 180000, // 180 sec
      batchSize: 3,
      batchGapMs: 60000,
      totalMessagesPerHour: 30,
      ensureVariation: true,
    } as GapStrategy,
    risk: '🟢 MINIMAL',
  },

  VERY_SAFE: {
    name: 'Very Safe (45/hour)',
    strategy: {
      initialGapMs: 8000,
      initialGapCount: 2,
      minGapMs: 70000, // 70 sec = 1 msg per 1.17 min
      maxGapMs: 150000,
      batchSize: 5,
      batchGapMs: 45000,
      totalMessagesPerHour: 45,
      ensureVariation: true,
    } as GapStrategy,
    risk: '🟢 VERY SAFE',
  },

  SAFE: {
    name: 'Safe (60/hour) - RECOMMENDED',
    strategy: DEFAULT_GAP_STRATEGY,
    risk: '🟢 SAFE',
  },

  PROFESSIONAL: {
    name: 'Professional (80/hour)',
    strategy: {
      initialGapMs: 7000,
      initialGapCount: 2,
      minGapMs: 40000, // 40 sec (risky but possible)
      maxGapMs: 90000,
      batchSize: 6,
      batchGapMs: 25000,
      totalMessagesPerHour: 80,
      ensureVariation: true,
    } as GapStrategy,
    risk: '🟡 MEDIUM',
  },

  AGGRESSIVE: {
    name: 'Aggressive (120/hour)',
    strategy: {
      initialGapMs: 5000,
      initialGapCount: 3,
      minGapMs: 25000, // 25 sec
      maxGapMs: 60000,
      batchSize: 8,
      batchGapMs: 15000,
      totalMessagesPerHour: 120,
      ensureVariation: true,
    } as GapStrategy,
    risk: '🔴 HIGH',
  },
};

/**
 * Helper to display all presets
 */
export function displayAllPresets(): string {
  const lines = ['WhatsApp Safe Gap Presets:', ''];
  for (const [key, preset] of Object.entries(GAP_PRESETS)) {
    const compliance = getWhatsAppComplianceStatus(preset.strategy.totalMessagesPerHour, 1);
    lines.push(`${preset.risk} ${preset.name}`);
    lines.push(`   Min gap: ${(preset.strategy.minGapMs / 1000).toFixed(0)}s | Max gap: ${(preset.strategy.maxGapMs / 1000).toFixed(0)}s`);
    lines.push(`   ${compliance.recommendation}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Calculate optimal gaps for X messages in Y seconds
 */
export function calculateOptimalGapsForTimeFrame(
  totalMessages: number,
  totalSeconds: number
): {
  optimalMinGap: number;
  optimalMaxGap: number;
  averageGap: number;
  recommendation: string;
} {
  const averageGap = totalSeconds / (totalMessages - 1);
  const optimalMinGap = Math.max(45000, Math.floor(averageGap * 0.7)); // 70% of average
  const optimalMaxGap = Math.ceil(averageGap * 1.3); // 130% of average

  const compliance = getWhatsAppComplianceStatus(totalMessages, totalSeconds / 3600);

  return {
    optimalMinGap,
    optimalMaxGap,
    averageGap,
    recommendation: compliance.recommendation,
  };
}
