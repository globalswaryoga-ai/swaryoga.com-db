/**
 * =====================================================
 * WEEKLY DATA SYNC: Atlas → Bunny
 * =====================================================
 * Called by Vercel Cron Job at /api/cron/weekly-sync (Sunday 2 AM UTC)
 * =====================================================
 */

import mongoose from 'mongoose';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';
import * as zlib from 'zlib';

export class WeeklySyncService {
  private bunnyClient: BunnyStorageClient;

  constructor(bunnyStorageKey: string) {
    this.bunnyClient = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
  }

  /**
   * Run weekly sync — called by Vercel Cron /api/cron/weekly-sync
   */
  async runSync(): Promise<{ success: boolean; message: string }> {
    const syncId = `weekly-${new Date().toISOString().split('T')[0]}`;
    logger.info(`🔄 Starting weekly sync: ${syncId}`);

    try {
      // Export all collections to Bunny as compressed JSON
      const db = mongoose.connection.db;
      if (!db) throw new Error('MongoDB not connected');

      const collections = await db.listCollections().toArray();
      const exportData: Record<string, any[]> = {};

      for (const col of collections) {
        try {
          const docs = await db.collection(col.name).find({}).toArray();
          exportData[col.name] = docs;
        } catch (e) {
          logger.warn(`Could not export collection ${col.name}`);
        }
      }

      // Compress JSON
      const json = JSON.stringify(exportData);
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(Buffer.from(json), (err, result) => err ? reject(err) : resolve(result));
      });

      // Upload to Bunny
      await this.bunnyClient.upload(`/weekly-backups/${syncId}.json.gz`, compressed);

      // Cleanup Atlas data older than 7 days
      await this.cleanupOldAtlasData(db);

      logger.info(`✅ Weekly sync complete: ${syncId} (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);
      return { success: true, message: `Sync complete: ${syncId}` };

    } catch (error) {
      logger.error('❌ Weekly sync failed', { error: (error as Error).message });
      return { success: false, message: (error as Error).message };
    }
  }

  private async cleanupOldAtlasData(db: any): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      try {
        const result = await db.collection(col.name).deleteMany({
          createdAt: { $lt: sevenDaysAgo },
        });
        if (result.deletedCount > 0) {
          logger.info(`🗑️ Cleaned ${result.deletedCount} old docs from ${col.name}`);
        }
      } catch {}
    }
  }
}

export async function initializeWeeklySync(_bunnyStorageKey: string) {
  // No-op: scheduling handled by Vercel Cron
  return new WeeklySyncService(_bunnyStorageKey);
}

export default WeeklySyncService;
