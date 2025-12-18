/**
 * MESSAGE TRACKER UTILITY
 * Track WhatsApp message delivery, status, and retries
 * File: /lib/messageTracker.ts
 */

import { WhatsAppMessage, MessageStatus } from './schemas/enterpriseSchemas';
import { connectDB } from './db';

export class MessageTracker {
  /**
   * Create message record
   */
  static async createMessage(messageData: any): Promise<any> {
    await connectDB();
    
    const message = await WhatsAppMessage.create({
      ...messageData,
      status: 'queued',
      createdAt: new Date(),
    });
    
    return message;
  }

  /**
   * Update message status
   */
  static async updateStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    metadata: any = {}
  ): Promise<void> {
    await connectDB();
    
    const updateData: any = { status };
    
    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
    }
    
    await WhatsAppMessage.findByIdAndUpdate(messageId, updateData);
    
    // Record status history
    await MessageStatus.create({
      messageId,
      status,
      statusChangedAt: new Date(),
      metadata,
    });
  }

  /**
   * Get message status
   */
  static async getMessageStatus(messageId: string): Promise<any> {
    await connectDB();
    
    return await WhatsAppMessage.findById(messageId).lean();
  }

  /**
   * Get delivery report
   */
  static async getDeliveryReport(filters: any = {}, limit: number = 100): Promise<any> {
    await connectDB();
    
    const messages = await WhatsAppMessage.find(filters)
      .select('phoneNumber status sentAt deliveredAt readAt sentBy')
      .limit(limit)
      .sort({ sentAt: -1 })
      .lean();
    
    // Calculate metrics
    const total = messages.length;
    const sent = messages.filter(m => m.status !== 'failed').length;
    const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
    const read = messages.filter(m => m.status === 'read').length;
    const failed = messages.filter(m => m.status === 'failed').length;
    
    return {
      total,
      metrics: {
        sent,
        delivered,
        read,
        failed,
        deliveryRate: ((delivered / total) * 100).toFixed(2) + '%',
        readRate: ((read / total) * 100).toFixed(2) + '%',
      },
      messages,
    };
  }

  /**
   * Mark for retry
   */
  static async markForRetry(messageId: string, maxRetries: number = 3): Promise<boolean> {
    await connectDB();
    
    const message = await WhatsAppMessage.findById(messageId);
    
    if (!message) {
      return false;
    }
    
    if (message.retryCount >= maxRetries) {
      return false; // Max retries exceeded
    }
    
    const retryDelay = Math.pow(2, message.retryCount) * 60 * 1000; // Exponential backoff
    
    await WhatsAppMessage.findByIdAndUpdate(messageId, {
      $inc: { retryCount: 1 },
      nextRetryAt: new Date(Date.now() + retryDelay),
      status: 'queued',
    });
    
    return true;
  }

  /**
   * Get messages pending retry
   */
  static async getPendingRetries(): Promise<any[]> {
    await connectDB();
    
    return await WhatsAppMessage.find({
      status: 'failed',
      retryCount: { $lt: 3 },
      nextRetryAt: { $lte: new Date() },
    }).lean();
  }

  /**
   * Log failure
   */
  static async logFailure(messageId: string, failureReason: string): Promise<void> {
    await connectDB();
    
    await WhatsAppMessage.findByIdAndUpdate(messageId, {
      status: 'failed',
      failureReason,
    });
  }

  /**
   * Get message statistics
   */
  static async getStatistics(dateRange: { start: Date; end: Date }): Promise<any> {
    await connectDB();
    
    const messages = await WhatsAppMessage.find({
      sentAt: {
        $gte: dateRange.start,
        $lte: dateRange.end,
      },
    }).lean();
    
    const stats = {
      total: messages.length,
      byStatus: {
        queued: messages.filter(m => m.status === 'queued').length,
        sent: messages.filter(m => m.status === 'sent').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        read: messages.filter(m => m.status === 'read').length,
        failed: messages.filter(m => m.status === 'failed').length,
      },
      averageRetries: messages.reduce((sum, m) => sum + m.retryCount, 0) / messages.length,
      failureRate: ((messages.filter(m => m.status === 'failed').length / messages.length) * 100).toFixed(2) + '%',
    };
    
    return stats;
  }

  /**
   * Get bulk send status
   */
  static async getBulkStatus(batchId: string): Promise<any> {
    await connectDB();
    
    const messages = await WhatsAppMessage.find({ bulkBatchId: batchId }).lean();
    
    return {
      batchId,
      total: messages.length,
      byStatus: {
        queued: messages.filter(m => m.status === 'queued').length,
        sent: messages.filter(m => m.status === 'sent').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        read: messages.filter(m => m.status === 'read').length,
        failed: messages.filter(m => m.status === 'failed').length,
      },
    };
  }

  /**
   * Clean old messages (retention policy)
   */
  static async cleanOldMessages(daysOld: number = 90): Promise<number> {
    await connectDB();
    
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await WhatsAppMessage.deleteMany({
      sentAt: { $lt: cutoffDate },
      status: { $in: ['delivered', 'read', 'failed'] },
    });
    
    return result.deletedCount;
  }
}
