/**
 * =====================================================
 * DAILY DATA EXPORT SERVICE
 * =====================================================
 * Exports MongoDB collections to Bunny as JSON files.
 * Called by Vercel Cron Job at /api/cron/export (3 AM UTC)
 *
 * Storage layout on Bunny:
 *   /data/latest/Course.json          ← always the freshest snapshot (overwritten)
 *   /data/history/2026-05-25/Course.json  ← date-stamped history (kept forever)
 *
 * This means:
 *  - You can always read /data/latest/Course.json for current data
 *  - You have full history in /data/history/YYYY-MM-DD/ for audits
 *  - Old history files are automatically cleaned after 90 days to save space
 * =====================================================
 */

import mongoose from 'mongoose';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';

// Collections to export — business data that apps read frequently
const COLLECTIONS_TO_EXPORT = [
  'Course',
  'CourseLesson',
  'CourseModule',
  'CourseSection',
  'CourseVideo',
  'CourseMaterial',
  'CourseEnrollment',
  'User',
  'Workshop',
  'WorkshopVideo',
  'Batch',
  'Sadhana',
  'SadhanaParticipant',
  'Video',
  'VideoWatchLog',
  'Program',
  'ProgramSession',
  'Purchase',
];

// Keep dated history for 90 days, then auto-clean old ones
const HISTORY_RETENTION_DAYS = 90;

export class DailyExportService {
  private bunny: BunnyStorageClient;

  constructor(bunnyStorageKey: string) {
    this.bunny = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
  }

  /**
   * Run the export — called by Vercel Cron /api/cron/export
   */
  async runExport(): Promise<{ results: any[]; totalSizeBytes: number; dateStr: string }> {
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    logger.info(`📊 Starting daily data export (${dateStr}) to Bunny...`);

    let totalSizeBytes = 0;
    const results: any[] = [];

    for (const collName of COLLECTIONS_TO_EXPORT) {
      try {
        const model = mongoose.models[collName];
        if (!model) {
          results.push({ collection: collName, status: 'skipped', reason: 'model not registered' });
          continue;
        }

        const docs = await model.find({}).lean();
        if (docs.length === 0) {
          results.push({ collection: collName, status: 'skipped', reason: 'empty collection' });
          continue;
        }

        const jsonStr = JSON.stringify(docs);
        const buffer = Buffer.from(jsonStr, 'utf-8');
        totalSizeBytes += buffer.length;

        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

        // 1. Always write to /data/latest/ (for app reads — always fresh)
        await this.bunny.upload(`/data/latest/${collName}.json`, buffer);

        // 2. Write to /data/history/YYYY-MM-DD/ (for audit trail)
        await this.bunny.upload(`/data/history/${dateStr}/${collName}.json`, buffer);

        results.push({
          collection: collName,
          status: 'success',
          count: docs.length,
          sizeMB,
        });

        logger.info(`  ✅ Exported ${collName}: ${docs.length} docs (${sizeMB} MB)`);
      } catch (error) {
        results.push({
          collection: collName,
          status: 'error',
          error: (error as Error).message,
        });
        logger.error(`  ❌ Export failed: ${collName}`, { error: (error as Error).message });
      }
    }

    // 3. Clean old history files (older than 90 days) to save Bunny storage
    await this.cleanOldHistory();

    logger.info(`✅ Daily export complete. Total: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    return { results, totalSizeBytes, dateStr };
  }

  /**
   * Delete history folders older than HISTORY_RETENTION_DAYS days.
   * Keeps /data/latest/ untouched.
   */
  private async cleanOldHistory(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

      // List all dated folders inside /data/history/
      const folders = await this.bunny.list('/data/history');
      if (!Array.isArray(folders)) return;

      for (const folder of folders) {
        const folderName: string = folder.ObjectName || folder.name || '';
        // folder name is YYYY-MM-DD — compare lexicographically (works for ISO dates)
        if (folderName && folderName < cutoffStr) {
          logger.info(`  🗑️  Cleaning old history folder: /data/history/${folderName}`);
          // Delete each file inside the folder
          try {
            const files = await this.bunny.list(`/data/history/${folderName}`);
            for (const file of files) {
              const fileName: string = file.ObjectName || file.name || '';
              if (fileName) {
                await this.bunny.delete(`/data/history/${folderName}/${fileName}`);
              }
            }
          } catch {
            // Non-fatal — skip if listing fails
          }
        }
      }
    } catch (err) {
      // Non-fatal — cleanup failure should not break the export
      logger.warn('⚠️  Could not clean old history folders', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Get current export stats (counts per collection)
   */
  async getExportStats(): Promise<{
    timestamp: Date;
    collections: Array<{ name: string; documents: number }>;
    totalCollections: number;
  }> {
    const stats: {
      timestamp: Date;
      collections: Array<{ name: string; documents: number }>;
      totalCollections: number;
    } = {
      timestamp: new Date(),
      collections: [],
      totalCollections: COLLECTIONS_TO_EXPORT.length,
    };

    for (const collName of COLLECTIONS_TO_EXPORT) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;
        const count = await model.countDocuments({});
        stats.collections.push({ name: collName, documents: count });
      } catch {
        // skip
      }
    }

    return stats;
  }
}

export async function initializeDailyExport(_bunnyStorageKey: string) {
  // No-op: scheduling handled by Vercel Cron
  return new DailyExportService(_bunnyStorageKey);
}

export default DailyExportService;
