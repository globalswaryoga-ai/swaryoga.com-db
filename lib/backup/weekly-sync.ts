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

// Collections that are SAFE to clean from MongoDB after archiving to Bunny.
// These are logs/analytics — they grow fast and are not needed for app queries.
const LOG_COLLECTIONS_TO_CLEAN = [
  'VideoWatchLog',
  'VideoAccessLog',
  'ViewTracking',
  'ErrorLog',
  'PostAnalytics',
];

// Auth/admin session collections — clean after 30 days (longer retention)
const SESSION_COLLECTIONS_TO_CLEAN = [
  'AdminSession',
];

// ⛔ These collections MUST NEVER be touched by cleanup:
// User, Course, CourseLesson, CourseModule, CourseSection, CourseVideo,
// CourseMaterial, CourseAssignment, CourseEnrollment, CourseReview,
// CourseDevice, RecordedCourse, Workshop, WorkshopVideo, WorkshopSeatInventory,
// Batch, Program, ProgramSession, Purchase, Payment, KYC, Company,
// Investment, InvestmentUser, OldInvestment, Sadhana, SadhanaParticipant,
// Video, Session (yoga content), Post, SocialAccount, AdminSettings

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
    cleanedLogs?: number;
    cleanedSessions?: number;
  }> {
    const syncId = `weekly-${new Date().toISOString().split('T')[0]}`;
    logger.info(`🔄 Starting weekly sync: ${syncId}`);

    try {
      const db = mongoose.connection.db;
      if (!db) throw new Error('MongoDB not connected');

      // ─── Step 1: Full snapshot of ALL collections → Bunny ───────────────────
      const snapshotSize = await this.takeFullSnapshot(db, syncId);

      // ─── Step 2: Clean log collections older than 7 days ────────────────────
      const cleanedLogs = await this.cleanLogCollections(db);

      // ─── Step 3: Clean old admin sessions (older than 30 days) ──────────────
      const cleanedSessions = await this.cleanSessionCollections(db);

      logger.info(`✅ Weekly sync complete: ${syncId}`, {
        snapshotSize,
        cleanedLogs,
        cleanedSessions,
      });

      return {
        success: true,
        message: `Weekly sync complete: ${syncId}`,
        snapshotSize,
        cleanedLogs,
        cleanedSessions,
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
   * Archive log collections older than 7 days to Bunny, then delete from MongoDB.
   * ONLY touches: VideoWatchLog, VideoAccessLog, ViewTracking, ErrorLog, PostAnalytics
   */
  private async cleanLogCollections(db: any): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = new Date().toISOString().split('T')[0];
    let totalDeleted = 0;

    logger.info('🗂️  Archiving old log collections...');

    for (const collName of LOG_COLLECTIONS_TO_CLEAN) {
      try {
        // Check if collection exists
        const exists = await db
          .listCollections({ name: collName })
          .hasNext();
        if (!exists) continue;

        const col = db.collection(collName);

        // Count records to archive
        const count = await col.countDocuments({ createdAt: { $lt: sevenDaysAgo } });
        if (count === 0) {
          logger.info(`  ℹ️  ${collName}: nothing to archive`);
          continue;
        }

        // Archive to Bunny before deleting
        const oldDocs = await col.find({ createdAt: { $lt: sevenDaysAgo } }).toArray();
        const compressed = await new Promise<Buffer>((resolve, reject) => {
          zlib.gzip(Buffer.from(JSON.stringify(oldDocs)), (err, r) =>
            err ? reject(err) : resolve(r)
          );
        });
        await this.bunnyClient.upload(
          `/archives/logs/${collName}/${dateStr}.json.gz`,
          compressed
        );

        // Now safe to delete from MongoDB
        const result = await col.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
        totalDeleted += result.deletedCount;

        logger.info(
          `  🗑️  ${collName}: archived ${count} docs → Bunny, deleted ${result.deletedCount} from Atlas`
        );
      } catch (err) {
        logger.error(`  ❌ Error cleaning ${collName}`, {
          error: (err as Error).message,
        });
      }
    }

    return totalDeleted;
  }

  /**
   * Clean old admin/auth session records (older than 30 days).
   * These are login sessions, safe to delete after 30 days.
   */
  private async cleanSessionCollections(db: any): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    logger.info('🔑 Cleaning old admin sessions...');

    for (const collName of SESSION_COLLECTIONS_TO_CLEAN) {
      try {
        const exists = await db.listCollections({ name: collName }).hasNext();
        if (!exists) continue;

        const col = db.collection(collName);

        // For AdminSession, use loginAt field
        const query =
          collName === 'AdminSession'
            ? { loginAt: { $lt: thirtyDaysAgo } }
            : { createdAt: { $lt: thirtyDaysAgo } };

        const result = await col.deleteMany(query);
        totalDeleted += result.deletedCount;

        if (result.deletedCount > 0) {
          logger.info(`  🗑️  ${collName}: deleted ${result.deletedCount} old sessions`);
        } else {
          logger.info(`  ℹ️  ${collName}: no old sessions to clean`);
        }
      } catch (err) {
        logger.error(`  ❌ Error cleaning sessions: ${collName}`, {
          error: (err as Error).message,
        });
      }
    }

    return totalDeleted;
  }
}

export async function initializeWeeklySync(_bunnyStorageKey: string) {
  // No-op: scheduling handled by Vercel Cron
  return new WeeklySyncService(_bunnyStorageKey);
}

export default WeeklySyncService;
