/**
 * QR WhatsApp Backup Service
 * Handles automatic backup of chats, contacts, and messages to Google Drive
 */

import { Db } from 'mongodb';

interface BackupConfig {
  userId: string;
  email: string;
  googleDriveId?: string;
  retentionDays: number;
}

export class QRBackupService {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Create a backup entry in the database
   */
  async createBackup(config: BackupConfig) {
    try {
      const backupId = `backup_${config.userId}_${Date.now()}`;

      await this.db.collection('qr_backup_logs').insertOne({
        _id: backupId,
        userId: config.userId,
        email: config.email,
        action: 'backup_created',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        itemsCount: {
          chats: 0,
          contacts: 0,
          messages: 0,
        },
        storageUsedMB: 0,
        driveFileIds: [],
        retentionDays: config.retentionDays,
      });

      return backupId;
    } catch (error) {
      console.error('[QRBackup] Create backup error:', error);
      throw error;
    }
  }

  /**
   * Get user's chat data for backup
   */
  async getChatData(userId: string, limit = 1000) {
    try {
      const chats = await this.db
        .collection('qr_whatsapp_chats')
        .find({ userId })
        .limit(limit)
        .toArray();

      return chats;
    } catch (error) {
      console.error('[QRBackup] Get chat data error:', error);
      return [];
    }
  }

  /**
   * Get user's message data for backup
   */
  async getMessageData(userId: string, limit = 10000) {
    try {
      const messages = await this.db
        .collection('qr_whatsapp_messages')
        .find({ userId })
        .limit(limit)
        .toArray();

      return messages;
    } catch (error) {
      console.error('[QRBackup] Get message data error:', error);
      return [];
    }
  }

  /**
   * Get user's contact data for backup
   */
  async getContactData(userId: string) {
    try {
      const contacts = await this.db
        .collection('qr_contacts')
        .find({ userId })
        .toArray();

      return contacts;
    } catch (error) {
      console.error('[QRBackup] Get contact data error:', error);
      return [];
    }
  }

  /**
   * Update backup status
   */
  async updateBackupStatus(
    backupId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    data?: Partial<any>
  ) {
    try {
      await this.db.collection('qr_backup_logs').updateOne(
        { _id: backupId },
        {
          $set: {
            status,
            updatedAt: new Date(),
            ...(data || {}),
          },
        }
      );
    } catch (error) {
      console.error('[QRBackup] Update status error:', error);
      throw error;
    }
  }

  /**
   * Get backup history for user
   */
  async getBackupHistory(userId: string, limit = 10) {
    try {
      const backups = await this.db
        .collection('qr_backup_logs')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return backups;
    } catch (error) {
      console.error('[QRBackup] Get history error:', error);
      return [];
    }
  }

  /**
   * Cleanup old backups based on retention policy
   */
  async cleanupOldBackups(userId: string, retentionDays: number) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.db
        .collection('qr_backup_logs')
        .deleteMany({
          userId,
          createdAt: { $lt: cutoffDate },
          status: 'completed',
        });

      console.log(`[QRBackup] Cleaned up ${result.deletedCount} old backups for user ${userId}`);
      return result.deletedCount;
    } catch (error) {
      console.error('[QRBackup] Cleanup error:', error);
      throw error;
    }
  }
}
