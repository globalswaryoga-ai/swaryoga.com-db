/**
 * =====================================================
 * BACKUP SYSTEM - Main Export
 * =====================================================
 * Complete Option C backup system initialization
 * =====================================================
 */

export { BackupService } from './backup-service';
export { RestoreService } from './restore-service';
export { ArchiveService } from './archive-service';
export { BackupScheduler } from './scheduler';
export { BunnyStorageClient } from './bunny-client';
export { ChunkedUploadService } from './chunked-upload';
export { logger } from './logger';
export { sendNotification } from './notification-service';
export { WeeklySyncService, initializeWeeklySync } from './weekly-sync';
export { DailyExportService, initializeDailyExport } from './daily-export';

import { BackupScheduler } from './scheduler';
import { logger } from './logger';
import { initializeWeeklySync } from './weekly-sync';
import { initializeDailyExport } from './daily-export';

/**
 * Global backup scheduler instance
 */
let scheduler: BackupScheduler | null = null;
let weeklySyncInitialized = false;
let dailyExportInitialized = false;

/**
 * Initialize backup system
 */
export async function initializeBackupSystem(): Promise<BackupScheduler> {
  if (scheduler) {
    logger.warn('⚠️  Backup system already initialized');
    return scheduler;
  }

  const bunnyStorageKey = process.env.BUNNY_STORAGE_KEY;
  if (!bunnyStorageKey) {
    throw new Error('BUNNY_STORAGE_KEY environment variable is required');
  }

  scheduler = new BackupScheduler(bunnyStorageKey);
  scheduler.initialize();

  // Initialize weekly sync if not already done
  if (!weeklySyncInitialized) {
    await initializeWeeklySync(bunnyStorageKey);
    weeklySyncInitialized = true;
    logger.info('✅ Weekly sync initialized');
  }

  // Initialize daily export if not already done
  if (!dailyExportInitialized) {
    await initializeDailyExport(bunnyStorageKey);
    dailyExportInitialized = true;
    logger.info('✅ Daily export initialized');
  }

  logger.info('✅ Backup system initialized successfully');
  return scheduler;
}

/**
 * Get scheduler instance
 */
export function getScheduler(): BackupScheduler {
  if (!scheduler) {
    throw new Error('Backup system not initialized. Call initializeBackupSystem() first.');
  }
  return scheduler;
}

/**
 * Graceful shutdown
 */
export function shutdownBackupSystem(): void {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
    logger.info('✅ Backup system shut down gracefully');
  }
}

export default {
  initializeBackupSystem,
  getScheduler,
  shutdownBackupSystem,
};
