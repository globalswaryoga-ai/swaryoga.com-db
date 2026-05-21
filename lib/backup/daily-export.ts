/**
 * =====================================================
 * DAILY DATA EXPORT SERVICE
 * =====================================================
 * Exports MongoDB collections to Bunny as JSON files
 * Called by Vercel Cron Job at /api/cron/export (3 AM UTC)
 * =====================================================
 */

import mongoose from 'mongoose';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';

export class DailyExportService {
  private bunny: BunnyStorageClient;
  private collectionsToExport: string[] = [
    'Course',
    'CourseLesson',
    'CourseModule',
    'CourseEnrollment',
    'User',
    'Workshop',
    'Sadhana',
    'SadhanaParticipant',
    'Video',
    'VideoWatchLog',
    'Program',
    'ProgramSession',
  ];

  constructor(bunnyStorageKey: string) {
    this.bunny = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
  }

  /**
   * Run the export — called by Vercel Cron /api/cron/export
   */
  async runExport(): Promise<{ results: any[]; totalSize: number }> {
    logger.info('📊 Starting daily data export to Bunny...');

    let totalSize = 0;
    const results: any[] = [];

    for (const collName of this.collectionsToExport) {
      try {
        const model = mongoose.models[collName];
        if (!model) {
          results.push({ collection: collName, status: 'skipped', reason: 'model not found' });
          continue;
        }

        const docs = await model.find({}).lean();
        if (docs.length === 0) {
          results.push({ collection: collName, status: 'skipped', reason: 'empty' });
          continue;
        }

        const buffer = Buffer.from(JSON.stringify(docs), 'utf-8');
        totalSize += buffer.length;

        await this.bunny.upload(`/data/${collName}.json`, buffer);

        results.push({
          collection: collName,
          status: 'success',
          count: docs.length,
          sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
        });

        logger.info(`✅ Exported ${collName}: ${docs.length} docs`);
      } catch (error) {
        results.push({ collection: collName, status: 'error', error: (error as Error).message });
        logger.error(`❌ Export failed: ${collName}`, { error: (error as Error).message });
      }
    }

    return { results, totalSize };
  }

  async getExportStats(): Promise<any> {
    const stats: any = { timestamp: new Date(), collections: [], totalSize: 0 };

    for (const collName of this.collectionsToExport) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;
        const count = await model.countDocuments({});
        stats.collections.push({ name: collName, documents: count });
      } catch {}
    }

    return stats;
  }
}

export async function initializeDailyExport(_bunnyStorageKey: string) {
  // No-op: scheduling handled by Vercel Cron
  return new DailyExportService(_bunnyStorageKey);
}

export default DailyExportService;
