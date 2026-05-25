/**
 * =====================================================
 * WEEKLY DATA SYNC: Atlas → Bunny
 * =====================================================
 * Called by Vercel Cron Job at /api/cron/weekly-sync
 * Schedule: 0 4 * * 0 (Sunday 4:00 AM UTC — after daily backup at 2 AM)
 *
 * What this does:
 *  1. Full DB snapshot → Bunny /weekly-backups/
 *  2. Clean ONLY log collections older than 7 days
 *     (VideoWatchLog, VideoAccessLog, ViewTracking, ErrorLog, PostAnalytics)
 *  3. Clean AdminSession records older than 30 days
 *
 * ⚠️  NEVER deletes: User, Course, Workshop, Purchase, Payment,
 *     CourseEnrollment, Batch, WorkshopVideo, or any business data.
 * =====================================================
 */

import mongoose from 'mongoose';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';
import * as zlib from 'zlib';

// ─── Archive to Bunny THEN delete from Atlas ────────────────────────────────
// Data worth keeping — saved to /archives/ on Bunny before removal.
// ⛔ NEVER add User, Course, Workshop, Purchase, Lead, Payment etc.
const ARCHIVE_COLLECTIONS: Array<{ name: string; days: number; dateField?: string }> = [
  // Video platform logs (overlap with daily — weekly catches anything missed)
  { name: 'VideoWatchLog',        days: 7   },
  { name: 'VideoAccessLog',       days: 7   },
  { name: 'ViewTracking',         days: 7   },
  { name: 'ErrorLog',             days: 7   },
  { name: 'PostAnalytics',        days: 7   },
  // CRM message history — 365 days in Atlas, then Bunny (1 year max on Bunny)
  { name: 'WhatsAppMessage',      days: 365 },
  { name: 'QrWhatsAppMessage',    days: 365 },
  // CRM logs — 30 days in Atlas
  { name: 'BroadcastRunMessage',  days: 30  },
  { name: 'AnalyticsEvent',       days: 30  },
  { name: 'AuditLog',             days: 30  },
  { name: 'EmailLog',             days: 30  },
  // Business history — 90 days in Atlas
  { name: 'FunnelStageHistory',   days: 90  },
  { name: 'AccAuditTrail',        days: 90  },
];

// ─── Delete directly (no archive needed — transient/diagnostic data) ─────────
const DELETE_ONLY_COLLECTIONS: Array<{ name: string; days: number; dateField?: string }> = [
  { name: 'MessageStatus',            days: 7,  dateField: 'statusChangedAt' },
  { name: 'WhatsAppWebhookEvent',     days: 7,  dateField: 'createdAt'       },
  { name: 'TallySyncLog',             days: 7,  dateField: 'createdAt'       },
  // Chat flows are max 15 days — 16 days = all guaranteed closed
  { name: 'ChatbotConversationState', days: 16, dateField: 'updatedAt'       },
  // Admin login sessions
  { name: 'AdminSession',             days: 30, dateField: 'loginAt'         },
];

// ⛔ These collections MUST NEVER be touched by any cleanup:
// User, Course, CourseSection, CourseVideo, CourseMaterial, CourseAssignment,
// CourseEnrollment, CourseReview, CourseDevice, RecordedCourse,
// Workshop, WorkshopVideo, WorkshopSeatInventory, Batch, Program,
// ProgramSession, Purchase, Payment, KYC, Company, Investment,
// Sadhana, SadhanaParticipant, Video, Session, Lead, LeadNote,
// LeadFollowUp, BroadcastRun, BroadcastList, AdminSettings

export class WeeklySyncService {
  private bunnyClient: BunnyStorageClient;

  constructor(bunnyStorageKey: string) {
    this.bunnyClient = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
  }

  /**
   * Run weekly sync — called by Vercel Cron /api/cron/weekly-sync
   */
  async runSync(): Promise<{
    success: boolean;
    message: string;
    snapshotSize?: string;
    archivedRecords?: number;
    deletedRecords?: number;
  }> {
    const syncId = `weekly-${new Date().toISOString().split('T')[0]}`;
    logger.info(`🔄 Starting weekly sync: ${syncId}`);

    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error('MongoDB not connected');

      // ─── Step 1: Full snapshot of ALL collections → Bunny ───────────────────
      const snapshotSize = await this.takeFullSnapshot(db, syncId);

      // ─── Step 2: Archive old collections → Bunny, then delete from Atlas ────
      const archivedRecords = await this.archiveOldCollections(db);

      // ─── Step 3: Delete transient/diagnostic collections from Atlas ──────────
      const deletedRecords = await this.deleteTransientCollections(db);

      // ─── Step 4: Clean Bunny archive files older than 1 year ─────────────────
      await this.cleanBunnyArchivesOlderThanOneYear();

      logger.info(`✅ Weekly sync complete: ${syncId}`, {
        snapshotSize, archivedRecords, deletedRecords,
      });

      return {
        success: true,
        message: `Weekly sync complete: ${syncId}`,
        snapshotSize,
        archivedRecords,
        deletedRecords,
      };
    } catch (error) {
      logger.error('❌ Weekly sync failed', { error: (error as Error).message });
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Take a full snapshot of every collection and upload to Bunny.
   * This is a raw full export — stored at /weekly-backups/YYYY-MM-DD.json.gz
   */
  private async takeFullSnapshot(db: any, syncId: string): Promise<string> {
    logger.info('📦 Taking full DB snapshot...');
    const collections = await db.listCollections().toArray();
    const exportData: Record<string, any[]> = {};

    for (const col of collections) {
      try {
        const docs = await db.collection(col.name).find({}).toArray();
        exportData[col.name] = docs;
        logger.info(`  ✅ Snapped ${col.name}: ${docs.length} docs`);
      } catch {
        logger.warn(`  ⚠️  Could not snapshot collection: ${col.name}`);
      }
    }

    const json = JSON.stringify(exportData);
    const compressed = await new Promise<Buffer>((resolve, reject) => {
      zlib.gzip(Buffer.from(json), (err, result) => (err ? reject(err) : resolve(result)));
    });

    const sizeMB = (compressed.length / 1024 / 1024).toFixed(2);
    await this.bunnyClient.upload(`/weekly-backups/${syncId}.json.gz`, compressed);

    logger.info(`☁️  Full snapshot uploaded: /weekly-backups/${syncId}.json.gz (${sizeMB} MB)`);
    return `${sizeMB} MB`;
  }

  /**
   * Archive old collections → Bunny, then delete from Atlas.
   * Covers: video logs, WA messages, CRM logs, business history.
   */
  private async archiveOldCollections(db: any): Promise<number> {
    const dateStr = new Date().toISOString().split('T')[0];
    let totalArchived = 0;

    logger.info('🗂️  Archiving old collections to Bunny...');

    for (const { name: collName, days, dateField = 'createdAt' } of ARCHIVE_COLLECTIONS) {
      try {
        const exists = await db.listCollections({ name: collName }).hasNext();
        if (!exists) continue;

        const col = db.collection(collName);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const query = { [dateField]: { $lt: cutoff } };

        const count = await col.countDocuments(query);
        if (count === 0) {
          logger.info(`  ℹ️  ${collName}: nothing to archive (>${days}d)`);
          continue;
        }

        // Archive to Bunny first
        const oldDocs = await col.find(query).toArray();
        const compressed = await new Promise<Buffer>((resolve, reject) => {
          zlib.gzip(Buffer.from(JSON.stringify(oldDocs)), (err, r) =>
            err ? reject(err) : resolve(r)
          );
        });
        await this.bunnyClient.upload(
          `/archives/${collName}/${dateStr}.json.gz`,
          compressed
        );

        // Delete from Atlas only after successful archive
        const result = await col.deleteMany(query);
        totalArchived += result.deletedCount;

        logger.info(
          `  📤 ${collName}: archived ${count} → Bunny, deleted ${result.deletedCount} from Atlas (>${days}d)`
        );
      } catch (err) {
        logger.error(`  ❌ Error archiving ${collName}`, { error: (err as Error).message });
      }
    }

    return totalArchived;
  }

  /**
   * Delete transient/diagnostic collections directly from Atlas.
   * No archive needed — these have zero long-term value.
   * Covers: MessageStatus, WhatsAppWebhookEvent, TallySyncLog,
   *         ChatbotConversationState, AdminSession.
   */
  private async deleteTransientCollections(db: any): Promise<number> {
    let totalDeleted = 0;

    logger.info('🗑️  Deleting transient collections from Atlas...');

    for (const { name: collName, days, dateField = 'createdAt' } of DELETE_ONLY_COLLECTIONS) {
      try {
        const exists = await db.listCollections({ name: collName }).hasNext();
        if (!exists) continue;

        const col = db.collection(collName);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const query = { [dateField]: { $lt: cutoff } };

        const result = await col.deleteMany(query);
        totalDeleted += result.deletedCount;

        if (result.deletedCount > 0) {
          logger.info(
            `  🗑️  ${collName}: deleted ${result.deletedCount} records (>${days}d by ${dateField})`
          );
        } else {
          logger.info(`  ℹ️  ${collName}: nothing to delete (>${days}d)`);
        }
      } catch (err) {
        logger.error(`  ❌ Error deleting ${collName}`, { error: (err as Error).message });
      }
    }

    return totalDeleted;
  }

  /**
   * Delete Bunny archive files older than 1 year.
   * WhatsApp messages are kept for 1 year on Bunny — after that, permanently gone.
   * Other archives (logs, analytics) are also cleaned after 1 year.
   */
  private async cleanBunnyArchivesOlderThanOneYear(): Promise<void> {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const cutoffDateStr = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    logger.info(`🗓️  Cleaning Bunny archives older than 1 year (before ${cutoffDateStr})...`);

    // Collections that have dated archive files on Bunny
    const archivePaths = [
      'WhatsAppMessage',
      'QrWhatsAppMessage',
      'BroadcastRunMessage',
      'AnalyticsEvent',
      'AuditLog',
      'EmailLog',
      'FunnelStageHistory',
      'AccAuditTrail',
      'VideoWatchLog',
      'VideoAccessLog',
      'ViewTracking',
      'ErrorLog',
      'PostAnalytics',
      'MessageStatus',
    ];

    for (const collName of archivePaths) {
      try {
        const files = await this.bunnyClient.list(`/archives/${collName}`);
        if (!Array.isArray(files) || files.length === 0) continue;

        for (const file of files) {
          const fileName: string = file.ObjectName || file.name || '';
          if (!fileName) continue;

          // File names are YYYY-MM-DD.json.gz — compare date prefix
          const fileDateStr = fileName.substring(0, 10);
          if (fileDateStr < cutoffDateStr) {
            await this.bunnyClient.delete(`/archives/${collName}/${fileName}`);
            logger.info(`  🗑️  Deleted old Bunny archive: /archives/${collName}/${fileName}`);
          }
        }
      } catch {
        // Non-fatal — skip if collection folder doesn't exist yet
      }
    }

    logger.info('✅ Bunny 1-year archive cleanup complete');
  }
}

export async function initializeWeeklySync(_bunnyStorageKey: string) {
  // No-op: scheduling handled by Vercel Cron
  return new WeeklySyncService(_bunnyStorageKey);
}

export default WeeklySyncService;
