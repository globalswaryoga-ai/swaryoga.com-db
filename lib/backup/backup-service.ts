/**
 * =====================================================
 * AUTOMATED BACKUP SERVICE
 * =====================================================
 * Daily automated MongoDB backup to Bunny CDN
 * Called by Vercel Cron at /api/cron/backup (2 AM UTC daily)
 *
 * Steps every night at 2 AM:
 *  1. Export all business collections from MongoDB
 *  2. GZIP compress  (90% size reduction)
 *  3. AES-256-GCM encrypt
 *  4. Upload to Bunny /backups/mongodb/YYYY-MM-DD/
 *  5. Archive old LOG data (VideoWatchLog etc.) → Bunny /archives/
 *     then delete those old logs from MongoDB (keeps Atlas lean)
 *  6. Remove soft-deleted Course/Workshop records from MongoDB
 *  7. Verify backup integrity
 *  8. Send WhatsApp alert on success or failure
 *
 * ⚠️  Only LOG collections are deleted from MongoDB.
 *     Business data (User, Course, Workshop, Purchase…) is NEVER deleted.
 * =====================================================
 */

import mongoose from 'mongoose';
import { gzip } from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import { BunnyStorageClient } from './bunny-client';
import { sendNotification } from './notification-service';
import { logger } from './logger';

const gzipAsync = promisify(gzip);

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = {
  // How many days of log data to keep in MongoDB (rest → archive to Bunny)
  LOG_RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '7'),
  ENCRYPTION_ENABLED: process.env.ENCRYPTION_ENABLED !== 'false',
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  BUNNY_BACKUP_PATH: '/backups/mongodb',
  BUNNY_ARCHIVE_PATH: '/archives',
};

// Collections backed up in the nightly encrypted snapshot
const BACKUP_COLLECTIONS = [
  { name: 'User' },
  { name: 'RecordedCourse' },
  { name: 'CourseVideo' },
  { name: 'CourseSection' },
  { name: 'CourseMaterial' },
  { name: 'CourseAssignment' },
  { name: 'CourseEnrollment' },
  { name: 'CourseReview' },
  { name: 'CourseDevice' },
  { name: 'Workshop' },
  { name: 'Batch' },
  { name: 'WorkshopVideo' },
  { name: 'WorkshopSeatInventory' },
  { name: 'UserDevice' },
  { name: 'Purchase' },
  { name: 'Payment' },
  { name: 'KYC' },
  { name: 'Program' },
  { name: 'ProgramSession' },
  { name: 'Sadhana' },
  { name: 'SadhanaParticipant' },
  { name: 'Video' },
  // Video logs — last 7 days only
  { name: 'VideoWatchLog',  daysBack: 7  },
  { name: 'VideoAccessLog', daysBack: 7  },
  { name: 'ViewTracking',   daysBack: 7  },
  { name: 'ErrorLog',       daysBack: 7  },
  // CRM logs — last 30 days only
  { name: 'WhatsAppMessage',    daysBack: 30 },
  { name: 'QrWhatsAppMessage',  daysBack: 30 },
  { name: 'BroadcastRunMessage',daysBack: 30 },
  { name: 'AnalyticsEvent',     daysBack: 30 },
  { name: 'AuditLog',           daysBack: 30 },
  { name: 'EmailLog',           daysBack: 30 },
];

// ─── Collections archived to Bunny THEN deleted from Atlas ─────────────────
// These have real data worth keeping — saved to Bunny before removal.
// ⛔ NEVER add User, Course, Workshop, Purchase, Payment etc. here.
const ARCHIVE_LOG_COLLECTIONS: Array<{ name: string; days: number }> = [
  // Video platform logs
  { name: 'VideoWatchLog',   days: 7  },
  { name: 'VideoAccessLog',  days: 7  },
  { name: 'ViewTracking',    days: 7  },
  { name: 'ErrorLog',        days: 7  },
  // CRM logs — worth archiving for audits
  { name: 'AnalyticsEvent',  days: 30 },
  { name: 'AuditLog',        days: 30 },
  { name: 'EmailLog',        days: 30 },
];

// ─── Collections deleted directly (no archive needed) ───────────────────────
// These are transient/diagnostic records with zero long-term value.
const DELETE_ONLY_COLLECTIONS: Array<{ name: string; days: number; dateField?: string }> = [
  { name: 'MessageStatus',             days: 7,  dateField: 'statusChangedAt' },
  { name: 'WhatsAppWebhookEvent',      days: 7,  dateField: 'createdAt'       },
  { name: 'TallySyncLog',              days: 7,  dateField: 'createdAt'       },
  // Chat flows are max 15 days — delete after 16 days (all guaranteed closed)
  { name: 'ChatbotConversationState',  days: 16, dateField: 'updatedAt'       },
];

// Soft-deleted records from these collections are permanently removed from MongoDB
// (they were already backed up in the encrypted snapshot above)
const SOFT_DELETE_COLLECTIONS = [
  'RecordedCourse',
  'CourseVideo',
  'Workshop',
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupMetadata {
  timestamp: Date;
  backupId: string;
  mongodbVersion: string;
  encryptionAlgorithm?: string;
  collections: Array<{
    name: string;
    count: number;
    size: number;
    checksum: string;
  }>;
  totalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  mongodbSizeBefore: number;
  mongodbSizeAfter: number;
  backupSizeMB: number;
  compressedSizeMB: number;
  bunnyPath: string;
  archivedLogRecords: number;
  deletedLogRecords: number;
  softDeletedRemoved: number;
  durationMs: number;
  errors?: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class BackupService {
  private bunny: BunnyStorageClient;
  private encryptionKey: string;

  constructor(bunnyStorageKey: string) {
    this.bunny = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  // ─── Public: Main entry point ───────────────────────────────────────────

  async executeBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = this.generateBackupId();

    logger.info('🔄 Starting nightly backup', { backupId });

    try {
      // 1. MongoDB size before
      const mongodbSizeBefore = await this.getMongoDBSize();
      logger.info(`📊 Atlas size before: ${mongodbSizeBefore} MB`, { backupId });

      // 2. Export data
      const backupData = await this.exportData(backupId);

      // 3. Metadata
      const metadata = this.createMetadata(backupId, backupData);

      // 4. Compress
      const compressed = await this.compressData(backupData, metadata);
      logger.info(
        `🗜️  Compressed: ${backupData.totalSize} MB → ${(compressed.length / 1024 / 1024).toFixed(1)} MB`,
        { backupId }
      );

      // 5. Encrypt
      const encrypted = CONFIG.ENCRYPTION_ENABLED
        ? this.encryptData(compressed, backupId)
        : compressed;

      // 6. Upload to Bunny
      const bunnyPath = await this.uploadToBunny(encrypted, backupId, metadata);
      logger.info(`☁️  Uploaded: ${bunnyPath}`, { backupId });

      // 7. Archive old LOG data → Bunny, then delete from Atlas
      const { archivedLogRecords, deletedLogRecords } =
        await this.archiveOldLogData(backupId);

      // 8. Remove soft-deleted business records from Atlas
      const softDeletedRemoved = await this.cleanSoftDeleted(backupId);

      // 9. Verify backup integrity
      await this.verifyBackupIntegrity(bunnyPath, backupId);

      // 10. MongoDB size after
      const mongodbSizeAfter = await this.getMongoDBSize();
      const savedMB = mongodbSizeBefore - mongodbSizeAfter;
      logger.info(
        `📊 Atlas size after: ${mongodbSizeAfter} MB (freed ${savedMB} MB)`,
        { backupId }
      );

      const result: BackupResult = {
        success: true,
        backupId,
        timestamp: new Date(),
        mongodbSizeBefore,
        mongodbSizeAfter,
        backupSizeMB: backupData.totalSize,
        compressedSizeMB: Math.round(encrypted.length / 1024 / 1024),
        bunnyPath,
        archivedLogRecords,
        deletedLogRecords,
        softDeletedRemoved,
        durationMs: Date.now() - startTime,
      };

      await sendNotification({ type: 'backup_success', backupId, result });
      logger.info('✅ Nightly backup complete!', result);
      return result;
    } catch (error) {
      logger.error('❌ Backup failed', {
        backupId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      await sendNotification({
        type: 'backup_error',
        backupId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ─── Private: Export all collections ───────────────────────────────────

  private async exportData(backupId: string) {
    const backupData: any = {
      timestamp: new Date(),
      backupId,
      mongodbVersion: mongoose.version,
      collections: {},
      metadata: [],
    };

    let totalSize = 0;

    for (const collInfo of BACKUP_COLLECTIONS) {
      try {
        const model = mongoose.models[collInfo.name];
        if (!model) {
          logger.warn(`  ⚠️  Model not found: ${collInfo.name}`, { backupId });
          continue;
        }

        // For log collections, only export recent records
        let query = {};
        if ('daysBack' in collInfo && collInfo.daysBack) {
          const cutoff = new Date(
            Date.now() - collInfo.daysBack * 24 * 60 * 60 * 1000
          );
          query = { createdAt: { $gte: cutoff } };
        }

        const docs = await model.find(query).lean().exec();
        backupData.collections[collInfo.name] = docs;

        const docJson = JSON.stringify(docs);
        const sizeMB = Math.round(docJson.length / 1024 / 1024);
        totalSize += sizeMB;

        backupData.metadata.push({
          name: collInfo.name,
          count: docs.length,
          size: sizeMB,
          checksum: crypto.createHash('sha256').update(docJson).digest('hex'),
        });

        logger.info(`  ✅ Exported ${collInfo.name}: ${docs.length} docs (${sizeMB} MB)`, {
          backupId,
        });
      } catch (error) {
        logger.error(`  ❌ Error exporting ${collInfo.name}`, {
          backupId,
          error: (error as Error).message,
        });
        throw error;
      }
    }

    backupData.totalSize = totalSize;
    return backupData;
  }

  // ─── Private: Metadata ──────────────────────────────────────────────────

  private createMetadata(backupId: string, backupData: any): BackupMetadata {
    return {
      timestamp: new Date(),
      backupId,
      mongodbVersion: backupData.mongodbVersion,
      encryptionAlgorithm: CONFIG.ENCRYPTION_ENABLED ? 'aes-256-gcm' : undefined,
      collections: backupData.metadata,
      totalSize: backupData.totalSize,
      compressedSize: 0,
      compressionRatio: 0,
    };
  }

  // ─── Private: Compress ──────────────────────────────────────────────────

  private async compressData(backupData: any, metadata: BackupMetadata): Promise<Buffer> {
    const json = JSON.stringify({ metadata, data: backupData.collections }, null, 2);
    const compressed = await gzipAsync(json);
    metadata.compressedSize = Math.round(compressed.length / 1024 / 1024);
    metadata.compressionRatio = Math.round((1 - compressed.length / json.length) * 100);
    return compressed;
  }

  // ─── Private: Encrypt ───────────────────────────────────────────────────

  private encryptData(data: Buffer, backupId: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: IV (16 bytes) + AuthTag (16 bytes) + EncryptedData
    const result = Buffer.concat([iv, authTag, encrypted]);
    logger.info('🔐 Encrypted with AES-256-GCM', { backupId });
    return result;
  }

  // ─── Private: Upload to Bunny ───────────────────────────────────────────

  private async uploadToBunny(
    data: Buffer,
    backupId: string,
    metadata: BackupMetadata
  ): Promise<string> {
    const dateStr = new Date().toISOString().split('T')[0];
    const backupFileName = `${CONFIG.BUNNY_BACKUP_PATH}/${dateStr}/${backupId}.gz`;
    const metaFileName = `${CONFIG.BUNNY_BACKUP_PATH}/${dateStr}/${backupId}-metadata.json`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        await this.bunny.upload(backupFileName, data);
        await this.bunny.upload(
          metaFileName,
          Buffer.from(JSON.stringify(metadata, null, 2))
        );
        logger.info(`☁️  Uploaded to Bunny (attempt ${attempt}): ${backupFileName}`, {
          backupId,
        });
        return backupFileName;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `⚠️  Upload attempt ${attempt}/${CONFIG.MAX_RETRIES} failed: ${(error as Error).message}`,
          { backupId }
        );
        if (attempt < CONFIG.MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY * attempt));
        }
      }
    }

    throw new Error(
      `Failed to upload after ${CONFIG.MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  // ─── Private: Archive old LOG data → Bunny, then delete from Atlas ────────

  private async archiveOldLogData(backupId: string): Promise<{
    archivedLogRecords: number;
    deletedLogRecords: number;
  }> {
    const dateStr = new Date().toISOString().split('T')[0];
    let archivedLogRecords = 0;
    let deletedLogRecords = 0;

    // ── 1. Archive to Bunny first, then delete from Atlas ──────────────────
    logger.info('🗂️  Archiving CRM/video log collections...', { backupId });

    for (const { name: collName, days } of ARCHIVE_LOG_COLLECTIONS) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const oldDocs = await model.find({ createdAt: { $lt: cutoff } }).lean();

        if (oldDocs.length === 0) {
          logger.info(`  ℹ️  ${collName}: nothing to archive (>${days}d)`);
          continue;
        }

        // Compress + upload to Bunny
        const compressed = await gzipAsync(JSON.stringify(oldDocs));
        const archivePath = `${CONFIG.BUNNY_ARCHIVE_PATH}/${collName}/${dateStr}.json.gz`;
        await this.bunny.upload(archivePath, compressed);

        // Delete from Atlas only after successful archive
        const del = await model.deleteMany({ createdAt: { $lt: cutoff } });
        archivedLogRecords += oldDocs.length;
        deletedLogRecords  += del.deletedCount;

        logger.info(
          `  📤 ${collName}: archived ${oldDocs.length} → Bunny, deleted ${del.deletedCount} from Atlas (>${days}d)`,
          { backupId }
        );
      } catch (error) {
        logger.error(`  ❌ Error archiving ${collName}`, {
          backupId, error: (error as Error).message,
        });
      }
    }

    // ── 2. Delete-only collections (transient/diagnostic, no archive needed) ─
    logger.info('🗑️  Cleaning transient CRM collections...', { backupId });

    for (const { name: collName, days, dateField = 'createdAt' } of DELETE_ONLY_COLLECTIONS) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const query = { [dateField]: { $lt: cutoff } };

        const count = await model.countDocuments(query);
        if (count === 0) {
          logger.info(`  ℹ️  ${collName}: nothing to delete (>${days}d)`);
          continue;
        }

        const del = await model.deleteMany(query);
        deletedLogRecords += del.deletedCount;

        logger.info(
          `  🗑️  ${collName}: deleted ${del.deletedCount} records from Atlas (>${days}d by ${dateField})`,
          { backupId }
        );
      } catch (error) {
        logger.error(`  ❌ Error cleaning ${collName}`, {
          backupId, error: (error as Error).message,
        });
      }
    }

    return { archivedLogRecords, deletedLogRecords };
  }

  // ─── Private: Remove soft-deleted records from Atlas ───────────────────

  private async cleanSoftDeleted(backupId: string): Promise<number> {
    let totalRemoved = 0;

    logger.info('🧹 Removing soft-deleted records from Atlas...', { backupId });

    for (const collName of SOFT_DELETE_COLLECTIONS) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;

        const result = await model.deleteMany({ deletedAt: { $exists: true } });
        if (result.deletedCount > 0) {
          totalRemoved += result.deletedCount;
          logger.info(
            `  🗑️  Removed ${result.deletedCount} soft-deleted ${collName} records`,
            { backupId }
          );
        }
      } catch (error) {
        logger.error(`  ❌ Error cleaning soft-deleted ${collName}`, {
          backupId,
          error: (error as Error).message,
        });
      }
    }

    return totalRemoved;
  }

  // ─── Private: Verify integrity ──────────────────────────────────────────

  private async verifyBackupIntegrity(bunnyPath: string, backupId: string): Promise<void> {
    try {
      const data = await this.bunny.download(bunnyPath);
      if (!data || data.length === 0) {
        throw new Error('Downloaded backup is empty — integrity check failed');
      }
      logger.info(`✅ Backup integrity verified (${(data.length / 1024 / 1024).toFixed(1)} MB)`, {
        backupId,
        bunnyPath,
      });
    } catch (error) {
      logger.error('❌ Backup integrity check failed', {
        backupId,
        bunnyPath,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ─── Private: MongoDB size ──────────────────────────────────────────────

  private async getMongoDBSize(): Promise<number> {
    try {
      if (!mongoose.connection.db) return 0;
      const stats = await mongoose.connection.db.stats();
      return Math.round(stats.dataSize / 1024 / 1024);
    } catch {
      return 0;
    }
  }

  // ─── Private: Generate backup ID ────────────────────────────────────────

  private generateBackupId(): string {
    const ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const rand = crypto.randomBytes(4).toString('hex');
    return `backup-${ts}-${rand}`;
  }
}

export default BackupService;
