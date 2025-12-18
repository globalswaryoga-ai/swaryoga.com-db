/**
 * RATE LIMIT MANAGER UTILITY
 * WhatsApp API rate limiting and pause/resume control
 * File: /lib/rateLimitManager.ts
 */

import { RateLimit } from './schemas/enterpriseSchemas';
import { connectDB } from './db';

export interface RateLimitConfig {
  hourly: number;      // Messages per hour
  daily: number;       // Messages per day
  perPhone: number;    // Messages to same phone per day
  warningThreshold: number; // % before warning (default 0.8 = 80%)
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  hourly: 1000,
  daily: 10000,
  perPhone: 5,
  warningThreshold: 0.8,
};

export class RateLimitManager {
  /**
   * Check if can send message
   */
  static async canSendMessage(userId: string, phoneNumber: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount?: number;
    limit?: number;
  }> {
    await connectDB();
    
    const now = new Date();
    
    // Check hourly limit
    const hourlyLimit = await RateLimit.findOne({
      limitKey: `${userId}:hourly`,
      limitType: 'hourly',
    });
    
    if (hourlyLimit && hourlyLimit.isPaused) {
      return {
        allowed: false,
        reason: `Messaging paused until ${hourlyLimit.resumeAt}`,
      };
    }
    
    if (hourlyLimit && hourlyLimit.messagesSent >= hourlyLimit.messagesLimit) {
      return {
        allowed: false,
        reason: 'Hourly limit reached',
        currentCount: hourlyLimit.messagesSent,
        limit: hourlyLimit.messagesLimit,
      };
    }
    
    // Check daily limit
    const dailyLimit = await RateLimit.findOne({
      limitKey: `${userId}:daily`,
      limitType: 'daily',
    });
    
    if (dailyLimit && dailyLimit.isPaused) {
      return {
        allowed: false,
        reason: `Messaging paused until ${dailyLimit.resumeAt}`,
      };
    }
    
    if (dailyLimit && dailyLimit.messagesSent >= dailyLimit.messagesLimit) {
      return {
        allowed: false,
        reason: 'Daily limit reached',
        currentCount: dailyLimit.messagesSent,
        limit: dailyLimit.messagesLimit,
      };
    }
    
    return { allowed: true };
  }

  /**
   * Increment message count
   */
  static async incrementCount(
    userId: string,
    _phoneNumber: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMITS
  ): Promise<void> {
    await connectDB();
    
    const now = new Date();
    
    // Update hourly
    const hourlyReset = new Date(now);
    hourlyReset.setHours(hourlyReset.getHours() + 1);
    
    await RateLimit.findOneAndUpdate(
      { limitKey: `${userId}:hourly`, limitType: 'hourly' },
      {
        $inc: { messagesSent: 1 },
        resetAt: hourlyReset,
        messagesLimit: config.hourly,
        warningThreshold: config.warningThreshold,
      },
      { upsert: true }
    );
    
    // Update daily
    const dailyReset = new Date(now);
    dailyReset.setDate(dailyReset.getDate() + 1);
    dailyReset.setHours(0, 0, 0, 0);
    
    await RateLimit.findOneAndUpdate(
      { limitKey: `${userId}:daily`, limitType: 'daily' },
      {
        $inc: { messagesSent: 1 },
        resetAt: dailyReset,
        messagesLimit: config.daily,
        warningThreshold: config.warningThreshold,
      },
      { upsert: true }
    );
  }

  /**
   * Check for warning threshold
   */
  static async checkWarningThreshold(userId: string): Promise<{
    warning: boolean;
    type?: string;
    percentage?: number;
  }> {
    await connectDB();
    
    const hourlyLimit = await RateLimit.findOne({
      limitKey: `${userId}:hourly`,
      limitType: 'hourly',
    });
    
    if (hourlyLimit) {
      const percentage = hourlyLimit.messagesSent / hourlyLimit.messagesLimit;
      
      if (percentage >= hourlyLimit.warningThreshold && !hourlyLimit.warningAlertSent) {
        await RateLimit.updateOne(
          { _id: hourlyLimit._id },
          { warningAlertSent: true }
        );
        
        return {
          warning: true,
          type: 'hourly',
          percentage,
        };
      }
    }
    
    return { warning: false };
  }

  /**
   * Pause messaging for user
   */
  static async pauseMessaging(userId: string, reason: string, resumeAt: Date): Promise<void> {
    await connectDB();
    
    await RateLimit.updateMany(
      { limitKey: new RegExp(`^${userId}`) },
      {
        isPaused: true,
        pausedReason: reason,
        pausedAt: new Date(),
        resumeAt,
      }
    );
  }

  /**
   * Resume messaging for user
   */
  static async resumeMessaging(userId: string): Promise<void> {
    await connectDB();
    
    await RateLimit.updateMany(
      { limitKey: new RegExp(`^${userId}`) },
      {
        isPaused: false,
        pausedAt: null,
        resumeAt: null,
      }
    );
  }

  /**
   * Get current status
   */
  static async getStatus(userId: string): Promise<any> {
    await connectDB();
    
    const hourly = await RateLimit.findOne({
      limitKey: `${userId}:hourly`,
      limitType: 'hourly',
    }).lean();
    
    const daily = await RateLimit.findOne({
      limitKey: `${userId}:daily`,
      limitType: 'daily',
    }).lean();
    
    return {
      hourly: hourly ? {
        sent: hourly.messagesSent,
        limit: hourly.messagesLimit,
        percentage: (hourly.messagesSent / hourly.messagesLimit * 100).toFixed(2) + '%',
        isPaused: hourly.isPaused,
        resumeAt: hourly.resumeAt,
      } : null,
      daily: daily ? {
        sent: daily.messagesSent,
        limit: daily.messagesLimit,
        percentage: (daily.messagesSent / daily.messagesLimit * 100).toFixed(2) + '%',
        isPaused: daily.isPaused,
        resumeAt: daily.resumeAt,
      } : null,
    };
  }

  /**
   * Auto-reset expired limits
   */
  static async autoResetExpiredLimits(): Promise<void> {
    await connectDB();
    
    const now = new Date();
    
    await RateLimit.updateMany(
      { resetAt: { $lt: now } },
      {
        messagesSent: 0,
        warningAlertSent: false,
      }
    );
  }
}
