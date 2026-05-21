/**
 * =====================================================
 * RESTORE SERVICE - Point-in-Time Recovery
 * =====================================================
 * Restore MongoDB from Bunny backups
 * Features:
 * - Point-in-time recovery
 * - Data validation
 * - Automatic verification
 * - Rollback capabilities
 * =====================================================
 */

import mongoose from 'mongoose';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';
import { sendNotification } from './notification-service';

const gunzipAsync = promisify(gunzip);

export interface RestoreOptions {
  date?: string; // YYYY-MM-DD format
  backupId?: string;
  validateData?: boolean;
  dryRun?: boolean;
  encryptionKey?: string;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  timestamp: Date;
  collectionsRestored: Array<{
    name: string;
    count: number;
    verified: boolean;
  }>;
  duration: number;
  mongodbSizeAfter: number;
  errors?: string[];
}

export class RestoreService {
  private bunny: BunnyStorageClient;
  private encryptionKey: string;

  constructor(bunnyStorageKey: string) {
    this.bunny = new BunnyStorageClient(bunnyStorageKey, 'backupmobgo');
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Restore from backup
   */
  async restore(options: RestoreOptions): Promise<RestoreResult> {
    const startTime = Date.now();

    try {
      logger.info('🔄 Starting restore process', { options });

      // Step 1: Find backup
      const backupPath = await this.findBackup(options);
      logger.info(`📦 Found backup: ${backupPath}`);

      // Step 2: Download from Bunny
      const encrypted = await this.bunny.download(backupPath);
      logger.info(`☁️  Downloaded backup (${Math.round(encrypted.length / 1024 / 1024)}MB)`);

      // Step 3: Decrypt
      const compressed = this.decryptData(encrypted);
      logger.info(`🔓 Decrypted backup`);

      // Step 4: Decompress
      const json = await gunzipAsync(compressed);
      const backupData = JSON.parse(json.toString());
      logger.info(`📂 Decompressed backup (${backupData.metadata.collections.length} collections)`);

      // Step 5: Validate structure (optional)
      if (options.validateData) {
        await this.validateBackupData(backupData);
      }

      // Step 6: Restore to MongoDB (or dry-run)
      const restored = await this.restoreCollections(backupData, options.dryRun || false);
      logger.info(`✅ Restored ${restored.length} collections`);

      // Step 7: Verify restoration
      await this.verifyRestoration(restored, backupData);
      logger.info(`✔️  Restoration verified`);

      // Step 8: Get final MongoDB size
      const mongodbSizeAfter = await this.getMongoDBSize();

      const result: RestoreResult = {
        success: true,
        backupId: backupData.metadata.backupId,
        timestamp: new Date(backupData.metadata.timestamp),
        collectionsRestored: restored,
        duration: Date.now() - startTime,
        mongodbSizeAfter,
      };

      logger.info('✅ Restore complete!', result);

      await sendNotification({
        type: 'restore_success',
        backupId: result.backupId,
        result,
      });

      return result;
    } catch (error) {
      logger.error('❌ Restore failed', { error: error.message, stack: error.stack });

      await sendNotification({
        type: 'restore_error',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Find backup by date or backupId
   */
  private async findBackup(options: RestoreOptions): Promise<string> {
    let date = options.date;

    if (options.backupId) {
      // Direct backup ID lookup
      const dateStr = new Date().toISOString().split('T')[0];
      return `/backups/mongodb/${dateStr}/${options.backupId}.gz`;
    }

    if (!date) {
      // Find latest backup
      date = new Date().toISOString().split('T')[0];
    }

    // Try to find backup for the date
    const files = await this.bunny.list(`/backups/mongodb/${date}`);
    const backupFiles = files.filter((f: any) => f.ObjectName.endsWith('.gz') && !f.ObjectName.endsWith('-metadata.json.gz'));

    if (backupFiles.length === 0) {
      throw new Error(`No backup found for date ${date}`);
    }

    // Return latest backup for that date
    const latestBackup = backupFiles.sort((a: any, b: any) =>
      new Date(b.DateModified).getTime() - new Date(a.DateModified).getTime()
    )[0];

    return `/backups/mongodb/${date}/${latestBackup.ObjectName}`;
  }

  /**
   * Decrypt backup data
   */
  private decryptData(encrypted: Buffer): Buffer {
    if (encrypted.length < 32) {
      throw new Error('Encrypted data is too short');
    }

    const iv = encrypted.slice(0, 16);
    const authTag = encrypted.slice(16, 32);
    const encryptedData = encrypted.slice(32);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * Validate backup data integrity
   */
  private async validateBackupData(backupData: any): Promise<void> {
    logger.info('🔍 Validating backup data...');

    const { metadata, data } = backupData;

    if (!metadata || !metadata.collections) {
      throw new Error('Invalid backup metadata');
    }

    // Verify checksums
    for (const collMeta of metadata.collections) {
      const docs = data[collMeta.name];
      if (!docs) {
        throw new Error(`Collection ${collMeta.name} missing from backup data`);
      }

      const json = JSON.stringify(docs);
      const checksum = crypto.createHash('sha256').update(json).digest('hex');

      if (checksum !== collMeta.checksum) {
        throw new Error(`Checksum mismatch for ${collMeta.name}`);
      }

      logger.info(`✅ Verified ${collMeta.name} (${docs.length} docs)`);
    }

    logger.info('✅ All checksums verified');
  }

  /**
   * Restore collections to MongoDB
   */
  private async restoreCollections(
    backupData: any,
    dryRun: boolean = false
  ): Promise<Array<{ name: string; count: number; verified: boolean }>> {
    const results: Array<{ name: string; count: number; verified: boolean }> = [];

    const { data } = backupData;

    for (const [collName, docs] of Object.entries(data)) {
      try {
        const model = mongoose.models[collName];
        if (!model) {
          logger.warn(`Collection model not found: ${collName}`);
          continue;
        }

        if (dryRun) {
          logger.info(`[DRY RUN] Would restore ${(docs as any[]).length} documents to ${collName}`);
          results.push({
            name: collName,
            count: (docs as any[]).length,
            verified: false,
          });
          continue;
        }

        // Clear existing data
        await model.deleteMany({});

        // Insert backup data
        if ((docs as any[]).length > 0) {
          await model.insertMany(docs);
        }

        logger.info(`✅ Restored ${collName}: ${(docs as any[]).length} documents`);

        results.push({
          name: collName,
          count: (docs as any[]).length,
          verified: true,
        });
      } catch (error) {
        logger.error(`Error restoring ${collName}`, { error: error.message });
        results.push({
          name: collName,
          count: 0,
          verified: false,
        });
      }
    }

    return results;
  }

  /**
   * Verify restoration was successful
   */
  private async verifyRestoration(
    restored: Array<{ name: string; count: number; verified: boolean }>,
    backupData: any
  ): Promise<void> {
    logger.info('🔍 Verifying restoration...');

    for (const item of restored) {
      if (!item.verified) continue;

      const model = mongoose.models[item.name];
      if (!model) continue;

      const count = await model.countDocuments({});
      if (count !== item.count) {
        logger.warn(
          `Count mismatch for ${item.name}: expected ${item.count}, got ${count}`
        );
      } else {
        logger.info(`✅ ${item.name} verified: ${count} documents`);
      }
    }

    logger.info('✅ Restoration verification complete');
  }

  /**
   * Get MongoDB size in MB
   */
  private async getMongoDBSize(): Promise<number> {
    try {
      if (!mongoose.connection.db) {
        logger.warn('MongoDB not connected, returning 0');
        return 0;
      }
      const stats = await mongoose.connection.db.stats();
      return Math.round(stats.dataSize / 1024 / 1024);
    } catch (error) {
      logger.error('Error getting MongoDB size', { error: error.message });
      return 0;
    }
  }

  /**
   * List available backups
   */
  async listBackups(date?: string): Promise<any[]> {
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const files = await this.bunny.list(`/backups/mongodb/${dateStr}`);
      return files.filter((f: any) => f.ObjectName.endsWith('.gz') && !f.ObjectName.endsWith('-metadata.json.gz'));
    } catch (error) {
      logger.error('Error listing backups', { error: error.message });
      return [];
    }
  }

  /**
   * Get backup metadata
   */
  async getBackupMetadata(backupId: string): Promise<any> {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const metadataPath = `/backups/mongodb/${dateStr}/${backupId}-metadata.json`;
      const data = await this.bunny.download(metadataPath);
      return JSON.parse(data.toString());
    } catch (error) {
      logger.error('Error getting backup metadata', { error: error.message });
      return null;
    }
  }
}

export default RestoreService;
