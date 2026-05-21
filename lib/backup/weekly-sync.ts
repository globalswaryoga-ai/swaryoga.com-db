/**
 * =====================================================
 * WEEKLY DATA SYNC: Atlas → Local MongoDB → Bunny
 * =====================================================
 * Every Sunday 2 AM UTC
 * - Export from Atlas
 * - Backup to Bunny
 * - Restore to Local MongoDB
 * Keep Local always fresh!
 * =====================================================
 */

import mongoose from 'mongoose';
import { BackupService } from './backup-service';
import { RestoreService } from './restore-service';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

// Import node-cron only on server side
let cron: any = null;
if (typeof window === 'undefined') {
  cron = require('node-cron');
}

export class WeeklySyncService {
  private backupService: BackupService;
  private restoreService: RestoreService;
  private bunnyClient: BunnyStorageClient;

  constructor(bunnyStorageKey: string) {
    this.backupService = new BackupService(bunnyStorageKey);
    this.restoreService = new RestoreService(bunnyStorageKey);
    this.bunnyClient = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
  }

  /**
   * Start weekly sync schedule
   * Every Sunday 2 AM UTC
   */
  startWeeklySync() {
    // 0 2 * * 0 = Every Sunday 2 AM UTC
    cron.schedule('0 2 * * 0', async () => {
      await this.performWeeklySync();
    });

    logger.info('✅ Weekly sync scheduled: Every Sunday 2 AM UTC');
  }

  /**
   * Main weekly sync process
   */
  private async performWeeklySync() {
    const syncId = `weekly-${new Date().toISOString().split('T')[0]}`;
    logger.info(`🔄 Starting weekly sync: ${syncId}`);

    try {
      // Step 1: Export from MongoDB Atlas
      logger.info('📤 Step 1: Exporting from MongoDB Atlas...');
      const mongoDbUri = process.env.MONGODB_URI_MAIN;
      const exportData = await this.exportFromAtlas(mongoDbUri);
      logger.info(`✅ Exported: ${(exportData.length / 1024 / 1024).toFixed(2)} MB`);

      // Step 2: Compress
      logger.info('🗜️  Step 2: Compressing data...');
      const compressed = await this.compressData(exportData);
      const compressedSize = (compressed.length / 1024 / 1024).toFixed(2);
      logger.info(`✅ Compressed: ${compressedSize} MB`);

      // Step 3: Upload to Bunny
      logger.info('☁️  Step 3: Uploading to Bunny CDN...');
      const fileName = `weekly-backups/${syncId}.tar.gz`;
      await this.bunnyClient.upload(fileName, compressed);
      logger.info(`✅ Uploaded to Bunny: ${fileName}`);

      // Step 4: Restore to Local MongoDB
      logger.info('🔄 Step 4: Restoring to Local MongoDB...');
      await this.restoreToLocal(compressed);
      logger.info('✅ Restored to local MongoDB');

      // Step 5: Verify sync
      logger.info('✔️  Step 5: Verifying sync...');
      const isValid = await this.verifySyncIntegrity();
      if (!isValid) {
        throw new Error('Sync verification failed!');
      }
      logger.info('✅ Sync verification passed!');

      // Step 6: Cleanup old Atlas data
      logger.info('🗑️  Step 6: Cleaning up old Atlas data (>7 days)...');
      await this.cleanupOldAtlasData();
      logger.info('✅ Old data cleaned from Atlas');

      logger.info(`✅ WEEKLY SYNC COMPLETE: ${syncId}`);
      
      // Send notification
      this.sendSyncNotification('success', syncId, compressedSize);

    } catch (error) {
      logger.error('❌ Weekly sync failed', { error: (error as Error).message });
      this.sendSyncNotification('failure', syncId, '0');
      throw error;
    }
  }

  /**
   * Export data from MongoDB Atlas
   */
  private async exportFromAtlas(mongoDbUri: string): Promise<Buffer> {
    const tempDir = `/tmp/atlas-export-${Date.now()}`;
    const fs = require('fs');
    const { execSync } = require('child_process');

    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Use mongodump to export
      const dumpDir = `${tempDir}/dump`;
      execSync(`mongodump --uri "${mongoDbUri}" --out "${dumpDir}"`, {
        stdio: 'pipe',
      });

      // Read exported data
      const archivePath = `${tempDir}/atlas-data.tar`;
      execSync(`tar -cf "${archivePath}" -C "${dumpDir}" .`);
      const data = fs.readFileSync(archivePath);

      // Cleanup
      execSync(`rm -rf "${tempDir}"`);

      return data;
    } catch (error) {
      throw new Error(`Failed to export from Atlas: ${(error as Error).message}`);
    }
  }

  /**
   * Compress data with GZIP
   */
  private async compressData(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  /**
   * Restore compressed data to Local MongoDB
   */
  private async restoreToLocal(compressedData: Buffer): Promise<void> {
    const tempDir = `/tmp/local-restore-${Date.now()}`;
    const fs = require('fs');
    const { execSync } = require('child_process');

    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Decompress
      const archivePath = `${tempDir}/data.tar.gz`;
      fs.writeFileSync(archivePath, compressedData);

      // Extract
      const extractDir = `${tempDir}/extract`;
      fs.mkdirSync(extractDir, { recursive: true });
      execSync(`tar -xzf "${archivePath}" -C "${extractDir}"`);

      // Restore to local MongoDB
      execSync(`mongorestore --uri "mongodb://localhost:27017" "${extractDir}/dump"`);

      // Cleanup
      execSync(`rm -rf "${tempDir}"`);
    } catch (error) {
      throw new Error(`Failed to restore to local: ${(error as Error).message}`);
    }
  }

  /**
   * Verify sync integrity
   */
  private async verifySyncIntegrity(): Promise<boolean> {
    try {
      // Connect to both Atlas and Local
      const atlasUri = process.env.MONGODB_URI_MAIN;
      const localUri = 'mongodb://localhost:27017';

      // Count documents in Atlas
      const atlasConn = await mongoose.connect(atlasUri);
      const atlasCount = await atlasConn.connection.db.stats();
      await mongoose.connection.close();

      // Count documents in Local
      const localConn = await mongoose.connect(localUri);
      const localCount = await localConn.connection.db.stats();
      await mongoose.connection.close();

      // Verify counts match (within 5% tolerance)
      const tolerance = atlasCount.objects * 0.05;
      const diff = Math.abs(atlasCount.objects - localCount.objects);

      return diff <= tolerance;
    } catch (error) {
      logger.error('Verification failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Cleanup Atlas data older than 7 days
   */
  private async cleanupOldAtlasData(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Connect to Atlas
      const conn = await mongoose.connect(process.env.MONGODB_URI_MAIN!);
      const db = conn.connection.db;

      // Get all collections
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        // Delete documents older than 7 days (if they have createdAt field)
        await db.collection(collection.name).deleteMany({
          createdAt: { $lt: sevenDaysAgo },
        });
      }

      await mongoose.connection.close();
      logger.info('✅ Old data cleaned from Atlas');
    } catch (error) {
      logger.warn('Could not cleanup old Atlas data', {
        error: (error as Error).message,
      });
      // Don't fail sync if cleanup fails
    }
  }

  /**
   * Send sync notification
   */
  private sendSyncNotification(
    status: 'success' | 'failure',
    syncId: string,
    dataSize: string
  ) {
    if (status === 'success') {
      logger.info(`🎉 Weekly Sync Success: ${syncId} (${dataSize} MB)`);
      // TODO: Send email/Slack notification
    } else {
      logger.error(`🚨 Weekly Sync Failed: ${syncId}`);
      // TODO: Send alert email/Slack notification
    }
  }
}

// Export initialization
export async function initializeWeeklySync(bunnyStorageKey: string) {
  const syncService = new WeeklySyncService(bunnyStorageKey);
  syncService.startWeeklySync();
  return syncService;
}
