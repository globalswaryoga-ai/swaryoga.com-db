/**
 * =====================================================
 * ARCHIVE SERVICE - Smart Hot/Warm/Cold Tiering
 * =====================================================
 * Manages data tiering:
 * - HOT (MongoDB): Last 7 days
 * - WARM (Bunny): 7-30 days
 * - COLD (Bunny): 30+ days
 * =====================================================
 */

import mongoose from 'mongoose';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { BunnyStorageClient } from './bunny-client';
import { logger } from './logger';

const gzipAsync = promisify(gzip);

export interface TieringConfig {
  hotDays: number; // Keep in MongoDB
  warmDays: number; // Keep indexed in Bunny
  coldDays: number; // Archive in Bunny
}

const DEFAULT_CONFIG: TieringConfig = {
  hotDays: 7,
  warmDays: 30,
  coldDays: 180,
};

export class ArchiveService {
  private bunny: BunnyStorageClient;
  private config: TieringConfig;

  constructor(bunnyStorageKey: string, config?: TieringConfig) {
    this.bunny = new BunnyStorageClient(bunnyStorageKey);
    this.config = config || DEFAULT_CONFIG;
  }

  /**
   * Analyze data distribution across tiers
   */
  async analyzeTiers(): Promise<any> {
    logger.info('📊 Analyzing data tiers...');

    const now = new Date();
    const hotDate = new Date(now.getTime() - this.config.hotDays * 24 * 60 * 60 * 1000);
    const warmDate = new Date(now.getTime() - this.config.warmDays * 24 * 60 * 60 * 1000);
    const coldDate = new Date(now.getTime() - this.config.coldDays * 24 * 60 * 60 * 1000);

    const collections = [
      'VideoWatchLog',
      'VideoAccessLog',
      'ViewTracking',
      'ErrorLog',
      'CourseEnrollment',
    ];

    const analysis: any = {
      timestamp: new Date(),
      tiers: {
        hot: { collections: {}, totalSize: 0 },
        warm: { collections: {}, totalSize: 0 },
        cold: { collections: {}, totalSize: 0 },
      },
    };

    for (const collName of collections) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;

        const hotCount = await model.countDocuments({ createdAt: { $gte: hotDate } });
        const warmCount = await model.countDocuments({
          createdAt: { $gte: warmDate, $lt: hotDate },
        });
        const coldCount = await model.countDocuments({ createdAt: { $lt: coldDate } });

        // Estimate sizes (rough)
        const avgDocSize = 0.001; // 1KB average
        const hotSize = hotCount * avgDocSize;
        const warmSize = warmCount * avgDocSize;
        const coldSize = coldCount * avgDocSize;

        analysis.tiers.hot.collections[collName] = { count: hotCount, size: hotSize };
        analysis.tiers.warm.collections[collName] = { count: warmCount, size: warmSize };
        analysis.tiers.cold.collections[collName] = { count: coldCount, size: coldSize };

        analysis.tiers.hot.totalSize += hotSize;
        analysis.tiers.warm.totalSize += warmSize;
        analysis.tiers.cold.totalSize += coldSize;

        logger.info(`${collName}: HOT=${hotCount}, WARM=${warmCount}, COLD=${coldCount}`);
      } catch (error) {
        logger.warn(`Error analyzing ${collName}`, { error: error.message });
      }
    }

    return analysis;
  }

  /**
   * Move data from HOT (MongoDB) to WARM (Bunny)
   */
  async promoteToWarm(): Promise<{ archived: number; deleted: number }> {
    logger.info('📤 Moving data to WARM tier...');

    const cutoffDate = new Date(Date.now() - this.config.warmDays * 24 * 60 * 60 * 1000);
    let totalArchived = 0;
    let totalDeleted = 0;

    const collections = ['VideoWatchLog', 'VideoAccessLog', 'ViewTracking', 'ErrorLog'];

    for (const collName of collections) {
      try {
        const model = mongoose.models[collName];
        if (!model) continue;

        const docs = await model.find({ createdAt: { $lt: cutoffDate } }).lean();

        if (docs.length === 0) continue;

        // Archive to Bunny
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `/archives/warm/${collName}/${dateStr}.json.gz`;

        const json = JSON.stringify(docs);
        const compressed = await gzipAsync(json);
        await this.bunny.upload(fileName, compressed);

        logger.info(
          `☁️  Archived ${docs.length} ${collName} documents to WARM tier`,
          { fileName }
        );

        // Delete from MongoDB
        const result = await model.deleteMany({ createdAt: { $lt: cutoffDate } });
        totalArchived += docs.length;
        totalDeleted += result.deletedCount;

        logger.info(`🗑️  Deleted ${result.deletedCount} ${collName} from MongoDB`);
      } catch (error) {
        logger.error(`Error promoting ${collName} to WARM`, { error: error.message });
      }
    }

    return { archived: totalArchived, deleted: totalDeleted };
  }

  /**
   * Move data from WARM (Bunny) to COLD (Bunny compressed)
   */
  async promoteToChild(): Promise<{ archived: number }> {
    logger.info('🥶 Moving data to COLD tier...');

    const cutoffDate = new Date(Date.now() - this.config.coldDays * 24 * 60 * 60 * 1000);
    let totalArchived = 0;

    try {
      const warmFiles = await this.bunny.list('/archives/warm');

      for (const file of warmFiles) {
        const fileDate = new Date(file.DateModified);
        if (fileDate > cutoffDate) continue;

        // Move from warm to cold
        const warmPath = `/archives/warm/${file.ObjectName}`;
        const coldPath = `/archives/cold/${file.ObjectName}`;

        try {
          const data = await this.bunny.download(warmPath);
          await this.bunny.upload(coldPath, data);
          await this.bunny.delete(warmPath);

          totalArchived++;
          logger.info(`❄️  Moved to COLD tier: ${file.ObjectName}`);
        } catch (error) {
          logger.warn(`Could not move file to COLD: ${file.ObjectName}`, {
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Error promoting to COLD tier', { error: error.message });
    }

    return { archived: totalArchived };
  }

  /**
   * Get data from any tier (intelligent retrieval)
   */
  async retrieveData(collName: string, dateStart: Date, dateEnd: Date): Promise<any[]> {
    logger.info(`📂 Retrieving ${collName} data...`, { dateStart, dateEnd });

    // First try to get from MongoDB (HOT)
    try {
      const model = mongoose.models[collName];
      if (model) {
        const docs = await model.find({
          createdAt: { $gte: dateStart, $lte: dateEnd },
        }).lean();

        if (docs.length > 0) {
          logger.info(`✅ Retrieved ${docs.length} docs from HOT tier (MongoDB)`);
          return docs;
        }
      }
    } catch (error) {
      logger.warn('Error querying HOT tier', { error: error.message });
    }

    // If not in MongoDB, try WARM tier (Bunny indexed)
    try {
      const warmFiles = await this.bunny.list(`/archives/warm/${collName}`);
      const relevantFiles = warmFiles.filter((f: any) => {
        const fileDate = new Date(f.DateModified);
        return fileDate >= dateStart && fileDate <= dateEnd;
      });

      let allDocs: any[] = [];
      for (const file of relevantFiles) {
        try {
          const warmPath = `/archives/warm/${collName}/${file.ObjectName}`;
          const compressed = await this.bunny.download(warmPath);
          // Decompress and parse
          const { gunzip } = require('zlib');
          const { promisify } = require('util');
          const gunzipAsync = promisify(gunzip);
          const decompressed = await gunzipAsync(compressed);
          const docs = JSON.parse(decompressed.toString());
          allDocs = allDocs.concat(docs);
        } catch (error) {
          logger.warn(`Error retrieving WARM file: ${file.ObjectName}`, {
            error: error.message,
          });
        }
      }

      if (allDocs.length > 0) {
        logger.info(`✅ Retrieved ${allDocs.length} docs from WARM tier (Bunny)`);
        return allDocs;
      }
    } catch (error) {
      logger.warn('Error querying WARM tier', { error: error.message });
    }

    // If not in WARM, try COLD tier (Bunny archived)
    try {
      logger.info('⏳ Retrieving from COLD tier (this may take a moment)...');
      const coldFiles = await this.bunny.list(`/archives/cold/${collName}`);
      const relevantFiles = coldFiles.filter((f: any) => {
        const fileDate = new Date(f.DateModified);
        return fileDate >= dateStart && fileDate <= dateEnd;
      });

      let allDocs: any[] = [];
      for (const file of relevantFiles) {
        try {
          const coldPath = `/archives/cold/${collName}/${file.ObjectName}`;
          const compressed = await this.bunny.download(coldPath);
          const { gunzip } = require('zlib');
          const { promisify } = require('util');
          const gunzipAsync = promisify(gunzip);
          const decompressed = await gunzipAsync(compressed);
          const docs = JSON.parse(decompressed.toString());
          allDocs = allDocs.concat(docs);
        } catch (error) {
          logger.warn(`Error retrieving COLD file: ${file.ObjectName}`, {
            error: error.message,
          });
        }
      }

      if (allDocs.length > 0) {
        logger.info(`✅ Retrieved ${allDocs.length} docs from COLD tier (Bunny)`);
        return allDocs;
      }
    } catch (error) {
      logger.warn('Error querying COLD tier', { error: error.message });
    }

    logger.info(`⚠️  No data found for ${collName} in date range`);
    return [];
  }

  /**
   * Get storage usage report
   */
  async getStorageReport(): Promise<any> {
    try {
      const analysis = await this.analyzeTiers();
      const storageStats = await this.bunny.getStorageStats();

      return {
        timestamp: new Date(),
        tierAnalysis: analysis,
        bunnyStorage: storageStats,
        recommendation: this.getRecommendation(analysis),
      };
    } catch (error) {
      logger.error('Error generating storage report', { error: error.message });
      return null;
    }
  }

  /**
   * Get storage recommendation based on analysis
   */
  private getRecommendation(analysis: any): string {
    const hotSize = analysis.tiers.hot.totalSize;
    const warmSize = analysis.tiers.warm.totalSize;

    if (hotSize > 2) {
      return '⚠️  HOT tier is large (>2GB). Consider reducing retention period.';
    }

    if (warmSize > 5) {
      return '⚠️  WARM tier is large (>5GB). Consider promoting to COLD tier.';
    }

    return '✅ Storage is well-balanced.';
  }
}

export default ArchiveService;
