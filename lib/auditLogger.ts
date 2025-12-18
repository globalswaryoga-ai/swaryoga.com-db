/**
 * AUDIT LOGGER UTILITY
 * Comprehensive logging for all admin and user actions
 * File: /lib/auditLogger.ts
 */

import { AuditLog } from './schemas/enterpriseSchemas';
import { connectDB } from './db';

export interface AuditLogEntry {
  userId: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  changesBefore?: any;
  changesAfter?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
  metadata?: any;
}

export class AuditLogger {
  /**
   * Log an action
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await connectDB();
      
      await AuditLog.create({
        ...entry,
        status: entry.status || 'success',
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit failure shouldn't break main operation
    }
  }

  /**
   * Get user's action history
   */
  static async getUserLogs(userId: string, limit: number = 50, skip: number = 0) {
    await connectDB();
    
    return await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Get logs by action type
   */
  static async getLogsByAction(actionType: string, limit: number = 100, skip: number = 0) {
    await connectDB();
    
    return await AuditLog.find({ actionType })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Get logs for specific resource
   */
  static async getResourceLogs(resourceType: string, resourceId: string) {
    await connectDB();
    
    return await AuditLog.find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Export logs for compliance
   */
  static async exportLogs(filters: any = {}): Promise<any[]> {
    await connectDB();
    
    return await AuditLog.find(filters)
      .select('-_id createdAt userId actionType resourceType description status')
      .sort({ createdAt: -1 })
      .lean();
  }
}
