/**
 * =====================================================
 * DAILY DATA EXPORT SERVICE
 * =====================================================
 * Exports MongoDB collections to Bunny as JSON files
 * Every day at 3 AM UTC (1 hour after daily backup)
 * Allows users to fetch data via CDN instead of MongoDB
 * =====================================================
 */

import cron from 'node-cron';
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
   * Start daily export schedule
   * Every day at 3 AM UTC
   */
  startDailyExport() {
    // 0 3 * * * = Every day 3 AM UTC
    cron.schedule('0 3 * * *', async () => {
      await this.performDailyExport();
    });

    logger.info('✅ Daily export scheduled: Every day 3 AM UTC');
  }

  /**
   * Main daily export process
   */
  private async performDailyExport() {
    logger.info('📊 Starting daily data export to Bunny...');
    const startTime = Date.now();

    try {
      let totalSize = 0;
      const results: any[] = [];

      for (const collName of this.collectionsToExport) {
        try {
          const model = mongoose.models[collName];
          if (!model) {
            logger.warn(`⚠️  Collection model not found: ${collName}`);
            continue;
          }

          // Fetch all documents
          const docs = await model.find({}).lean();

          if (docs.length === 0) {
            logger.info(`⏭️  Skipping empty collection: ${collName}`);
            continue;
          }

          // Convert to JSON
          const json = JSON.stringify(docs);
          const buffer = Buffer.from(json, 'utf-8');
          totalSize += buffer.length;

          // Upload to Bunny
          const fileName = `/data/${collName}.json`;
          await this.bunny.upload(fileName, buffer);

          results.push({
            collection: collName,
            count: docs.length,
            size: Math.round(buffer.length / 1024 / 1024 * 100) / 100, // MB
          });

          logger.info(`✅ Exported ${collName}: ${docs.length} documents (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        } catch (error) {
          logger.error(`❌ Error exporting ${collName}`, {
            error: (error as Error).message,
          });
          results.push({
            collection: collName,
            count: 0,
            size: 0,
            error: (error as Error).message,
          });
        }
      }

      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      logger.info(`✅ Daily export complete in ${duration} minutes`, {
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
        collections: results.length,
      });

      // Log export results
      logger.info('📊 Export Summary:', results);

    } catch (error) {
      logger.error('❌ Daily export failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats(): Promise<any> {
    try {
      const stats: any = {
        timestamp: new Date(),
        collections: [],
        totalSize: 0,
      };

      for (const collName of this.collectionsToExport) {
        try {
          const model = mongoose.models[collName];
          if (!model) continue;

          const count = await model.countDocuments({});
          const avgDocSize = 1; // 1KB estimate
          const estimatedSize = (count * avgDocSize) / 1024; // MB

          stats.collections.push({
            name: collName,
            documents: count,
            estimatedSize: estimatedSize.toFixed(2),
          });

          stats.totalSize += estimatedSize;
        } catch (error) {
          logger.warn(`Error getting stats for ${collName}`, {
            error: (error as Error).message,
          });
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting export stats', {
        error: (error as Error).message,
      });
      return null;
    }
  }
}

// Export initialization
export async function initializeDailyExport(bunnyStorageKey: string) {
  const exportService = new DailyExportService(bunnyStorageKey);
  exportService.startDailyExport();
  return exportService;
}

export default DailyExportService;
