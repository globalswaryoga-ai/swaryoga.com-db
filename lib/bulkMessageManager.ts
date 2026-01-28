/**
 * BULK MESSAGE MANAGER
 * Handles 10,000 messages/day capacity with intelligent batching
 * File: /lib/bulkMessageManager.ts
 */

import { connectDB } from '@/lib/db';
import { BroadcastRun, BroadcastRunMessage, RateLimit } from '@/lib/schemas/enterpriseSchemas';

// ============================================================================
// CONFIGURATION
// ============================================================================
export const BULK_CONFIG = {
  // Daily limits
  DAILY_LIMIT: 10000,
  HOURLY_LIMIT: 1000,
  
  // Batch processing
  BATCH_SIZE: 50,              // Messages per batch
  BATCH_DELAY_MS: 2000,        // 2 seconds between batches (30 msg/sec safe rate)
  MESSAGE_DELAY_MS: 100,       // 100ms between individual messages
  
  // Meta API rate limits (conservative)
  META_MESSAGES_PER_SECOND: 25,  // Safe limit (Meta allows up to 80/s for tier 4)
  QR_MESSAGES_PER_SECOND: 5,     // QR bridge is slower
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,        // 5 seconds between retries
  
  // Warning thresholds
  WARNING_THRESHOLD: 0.8,      // 80% - show warning
  CRITICAL_THRESHOLD: 0.95,    // 95% - critical warning
};

// ============================================================================
// TYPES
// ============================================================================
export interface DailyQuotaStatus {
  date: string;
  sent: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical' | 'exhausted';
  canSend: boolean;
  estimatedDeliveryTime?: string;
}

export interface BatchProgress {
  runId: string;
  totalMessages: number;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  estimatedTimeRemaining: string;
  messagesPerSecond: number;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'error';
}

export interface BulkSendOptions {
  provider: 'meta' | 'qr';
  batchSize?: number;
  batchDelayMs?: number;
  maxMessagesPerRun?: number;
  priority?: 'normal' | 'high' | 'low';
}

// ============================================================================
// BULK MESSAGE MANAGER CLASS
// ============================================================================
export class BulkMessageManager {
  
  // ==========================================================================
  // DAILY QUOTA MANAGEMENT
  // ==========================================================================
  
  /**
   * Get current daily quota status
   */
  static async getDailyQuotaStatus(): Promise<DailyQuotaStatus> {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's usage from rate limits
    const dailyLimit = await RateLimit.findOne({
      limitKey: 'broadcast:daily',
      limitType: 'daily',
    }).lean() as any;
    
    const sent = dailyLimit?.messagesSent || 0;
    const limit = BULK_CONFIG.DAILY_LIMIT;
    const remaining = Math.max(0, limit - sent);
    const percentage = (sent / limit) * 100;
    
    let status: DailyQuotaStatus['status'] = 'normal';
    if (percentage >= 100) status = 'exhausted';
    else if (percentage >= BULK_CONFIG.CRITICAL_THRESHOLD * 100) status = 'critical';
    else if (percentage >= BULK_CONFIG.WARNING_THRESHOLD * 100) status = 'warning';
    
    // Estimate delivery time for remaining messages
    const estimatedSeconds = remaining / BULK_CONFIG.META_MESSAGES_PER_SECOND;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    const estimatedHours = Math.floor(estimatedMinutes / 60);
    const remainingMins = estimatedMinutes % 60;
    
    return {
      date: todayStr,
      sent,
      limit,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
      status,
      canSend: remaining > 0,
      estimatedDeliveryTime: estimatedHours > 0 
        ? `${estimatedHours}h ${remainingMins}m` 
        : `${estimatedMinutes}m`,
    };
  }
  
  /**
   * Increment daily usage counter
   */
  static async incrementDailyUsage(count: number = 1): Promise<void> {
    await connectDB();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    await RateLimit.findOneAndUpdate(
      { limitKey: 'broadcast:daily', limitType: 'daily' },
      {
        $inc: { messagesSent: count },
        $setOnInsert: {
          messagesLimit: BULK_CONFIG.DAILY_LIMIT,
          warningThreshold: BULK_CONFIG.WARNING_THRESHOLD,
        },
        resetAt: tomorrow,
      },
      { upsert: true }
    );
  }
  
  /**
   * Check if can send more messages today
   */
  static async canSendToday(count: number = 1): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const quota = await this.getDailyQuotaStatus();
    
    if (!quota.canSend) {
      return {
        allowed: false,
        reason: `Daily limit exhausted (${quota.sent}/${quota.limit}). Resets at midnight.`,
        remaining: 0,
      };
    }
    
    if (quota.remaining < count) {
      return {
        allowed: false,
        reason: `Not enough quota. Need ${count}, have ${quota.remaining} remaining.`,
        remaining: quota.remaining,
      };
    }
    
    return { allowed: true, remaining: quota.remaining };
  }
  
  // ==========================================================================
  // BATCH PROCESSING
  // ==========================================================================
  
  /**
   * Calculate optimal batch configuration based on message count
   */
  static calculateBatchConfig(totalMessages: number, provider: 'meta' | 'qr' = 'meta'): {
    batchSize: number;
    batchDelayMs: number;
    totalBatches: number;
    estimatedTimeMs: number;
    messagesPerSecond: number;
  } {
    const messagesPerSecond = provider === 'meta' 
      ? BULK_CONFIG.META_MESSAGES_PER_SECOND 
      : BULK_CONFIG.QR_MESSAGES_PER_SECOND;
    
    // Adjust batch size based on total messages
    let batchSize = BULK_CONFIG.BATCH_SIZE;
    let batchDelayMs = BULK_CONFIG.BATCH_DELAY_MS;
    
    if (totalMessages > 5000) {
      // Large broadcast: smaller batches, longer delays to avoid rate limits
      batchSize = 30;
      batchDelayMs = 3000;
    } else if (totalMessages > 1000) {
      batchSize = 40;
      batchDelayMs = 2500;
    } else if (totalMessages < 100) {
      // Small broadcast: can be faster
      batchSize = 20;
      batchDelayMs = 1500;
    }
    
    const totalBatches = Math.ceil(totalMessages / batchSize);
    const messageTimeMs = totalMessages * (1000 / messagesPerSecond);
    const batchDelayTimeMs = (totalBatches - 1) * batchDelayMs;
    const estimatedTimeMs = messageTimeMs + batchDelayTimeMs;
    
    return {
      batchSize,
      batchDelayMs,
      totalBatches,
      estimatedTimeMs,
      messagesPerSecond,
    };
  }
  
  /**
   * Get progress for a broadcast run
   */
  static async getBroadcastProgress(runId: string): Promise<BatchProgress | null> {
    await connectDB();
    
    const run = await BroadcastRun.findById(runId).lean() as any;
    if (!run) return null;
    
    const stats = run.stats || {};
    const total = stats.total || 0;
    const sent = stats.sent || 0;
    const failed = stats.failed || 0;
    const skipped = stats.skipped || 0;
    const pending = stats.pending || 0;
    const processed = sent + failed + skipped;
    
    const batchConfig = this.calculateBatchConfig(total, run.provider || 'meta');
    const currentBatch = Math.ceil(processed / batchConfig.batchSize);
    
    // Calculate estimated time remaining
    const remainingMessages = total - processed;
    const remainingTimeMs = (remainingMessages / batchConfig.messagesPerSecond) * 1000;
    const remainingBatches = Math.ceil(remainingMessages / batchConfig.batchSize);
    const batchDelayTimeMs = remainingBatches * batchConfig.batchDelayMs;
    const totalRemainingMs = remainingTimeMs + batchDelayTimeMs;
    
    const remainingMinutes = Math.ceil(totalRemainingMs / 60000);
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    
    let status: BatchProgress['status'] = 'queued';
    if (run.status === 'running') status = 'processing';
    else if (run.status === 'completed') status = 'completed';
    else if (run.status === 'failed') status = 'error';
    else if (run.status === 'paused') status = 'paused';
    
    return {
      runId,
      totalMessages: total,
      processed,
      sent,
      failed,
      skipped,
      currentBatch,
      totalBatches: batchConfig.totalBatches,
      percentage: total > 0 ? Math.round((processed / total) * 100) : 0,
      estimatedTimeRemaining: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
      messagesPerSecond: batchConfig.messagesPerSecond,
      status,
    };
  }
  
  /**
   * Get all active broadcast progress
   */
  static async getAllActiveProgress(): Promise<BatchProgress[]> {
    await connectDB();
    
    const activeRuns = await BroadcastRun.find({
      status: { $in: ['draft', 'scheduled', 'running'] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    const progress: BatchProgress[] = [];
    for (const run of activeRuns) {
      const p = await this.getBroadcastProgress(String((run as any)._id));
      if (p) progress.push(p);
    }
    
    return progress;
  }
  
  // ==========================================================================
  // BROADCAST VALIDATION
  // ==========================================================================
  
  /**
   * Validate broadcast before sending
   */
  static async validateBroadcast(recipientCount: number): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    estimatedTime: string;
    quotaAfterSend: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check daily quota
    const quota = await this.getDailyQuotaStatus();
    
    if (recipientCount > quota.remaining) {
      errors.push(`Not enough daily quota. Need ${recipientCount}, have ${quota.remaining} remaining.`);
    }
    
    if (quota.status === 'warning') {
      warnings.push(`Daily quota at ${quota.percentage.toFixed(1)}%. ${quota.remaining} messages remaining.`);
    }
    
    if (quota.status === 'critical') {
      warnings.push(`⚠️ Daily quota critical at ${quota.percentage.toFixed(1)}%! Only ${quota.remaining} messages remaining.`);
    }
    
    if (recipientCount > 5000) {
      warnings.push(`Large broadcast (${recipientCount} recipients). Consider splitting into multiple runs.`);
    }
    
    // Calculate estimated time
    const batchConfig = this.calculateBatchConfig(recipientCount);
    const estimatedMinutes = Math.ceil(batchConfig.estimatedTimeMs / 60000);
    const hours = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    const estimatedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedTime,
      quotaAfterSend: quota.remaining - recipientCount,
    };
  }
  
  // ==========================================================================
  // PAUSE / RESUME
  // ==========================================================================
  
  /**
   * Pause a broadcast run
   */
  static async pauseBroadcast(runId: string, reason: string = 'Manual pause'): Promise<boolean> {
    await connectDB();
    
    const result = await BroadcastRun.updateOne(
      { _id: runId, status: 'running' },
      {
        $set: {
          status: 'paused',
          pausedAt: new Date(),
          pauseReason: reason,
          updatedAt: new Date(),
        },
      }
    );
    
    return result.modifiedCount > 0;
  }
  
  /**
   * Resume a paused broadcast run
   */
  static async resumeBroadcast(runId: string): Promise<boolean> {
    await connectDB();
    
    const result = await BroadcastRun.updateOne(
      { _id: runId, status: 'paused' },
      {
        $set: {
          status: 'running',
          resumedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          pausedAt: 1,
          pauseReason: 1,
        },
      }
    );
    
    return result.modifiedCount > 0;
  }
  
  /**
   * Cancel a broadcast run
   */
  static async cancelBroadcast(runId: string, reason: string = 'Manual cancel'): Promise<boolean> {
    await connectDB();
    
    // Cancel the run
    const result = await BroadcastRun.updateOne(
      { _id: runId, status: { $in: ['draft', 'scheduled', 'running', 'paused'] } },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
          updatedAt: new Date(),
        },
      }
    );
    
    // Mark all pending messages as cancelled
    if (result.modifiedCount > 0) {
      await BroadcastRunMessage.updateMany(
        { runId, status: 'pending' },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );
    }
    
    return result.modifiedCount > 0;
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  /**
   * Get broadcast statistics for dashboard
   */
  static async getBroadcastStats(): Promise<{
    today: { sent: number; failed: number; pending: number };
    thisWeek: { sent: number; failed: number };
    thisMonth: { sent: number; failed: number };
    quota: DailyQuotaStatus;
    activeRuns: number;
  }> {
    await connectDB();
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    // Today's stats
    const todayMessages = await BroadcastRunMessage.aggregate([
      { $match: { updatedAt: { $gte: todayStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const todayMap = new Map<string, number>(todayMessages.map((m: any) => [m._id, Number(m.count)]));
    
    // Week stats
    const weekMessages = await BroadcastRunMessage.aggregate([
      { $match: { updatedAt: { $gte: weekStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const weekMap = new Map<string, number>(weekMessages.map((m: any) => [m._id, Number(m.count)]));
    
    // Month stats
    const monthMessages = await BroadcastRunMessage.aggregate([
      { $match: { updatedAt: { $gte: monthStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const monthMap = new Map<string, number>(monthMessages.map((m: any) => [m._id, Number(m.count)]));
    
    // Active runs
    const activeRuns = await BroadcastRun.countDocuments({
      status: { $in: ['running', 'scheduled'] },
    });
    
    const quota = await this.getDailyQuotaStatus();
    
    return {
      today: {
        sent: Number(todayMap.get('sent') || 0),
        failed: Number(todayMap.get('failed') || 0),
        pending: Number(todayMap.get('pending') || 0) + Number(todayMap.get('sending') || 0),
      },
      thisWeek: {
        sent: Number(weekMap.get('sent') || 0),
        failed: Number(weekMap.get('failed') || 0),
      },
      thisMonth: {
        sent: Number(monthMap.get('sent') || 0),
        failed: Number(monthMap.get('failed') || 0),
      },
      quota,
      activeRuns,
    };
  }
}
