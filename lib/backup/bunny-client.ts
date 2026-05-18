/**
 * =====================================================
 * BUNNY CDN STORAGE CLIENT
 * =====================================================
 * Authenticated API client for Bunny Storage
 * Handles uploads, downloads, and file management
 * =====================================================
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export class BunnyStorageClient {
  private storageKey: string;
  private storageZone: string;
  private region: string;
  private baseUrl: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    this.storageZone = process.env.BUNNY_STORAGE_ZONE || 'swaryoga-storage';
    this.region = process.env.BUNNY_REGION || 'sg'; // Singapore
    this.baseUrl = `https://${this.region}.storage.bunnycdn.com`;
  }

  /**
   * Upload file to Bunny Storage
   */
  async upload(filePath: string, data: Buffer, retries = 3): Promise<void> {
    const url = `${this.baseUrl}/${this.storageZone}${filePath}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            AccessKey: this.storageKey,
            'Content-Type': 'application/octet-stream',
          },
          body: data,
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info(`✅ Uploaded to Bunny: ${filePath} (${Math.round(data.length / 1024 / 1024)}MB)`, {
          url,
        });
        return;
      } catch (error) {
        logger.warn(
          `⚠️  Upload attempt ${attempt}/${retries} failed: ${error.message}`,
          { filePath }
        );

        if (attempt === retries) {
          throw new Error(
            `Failed to upload ${filePath} after ${retries} attempts: ${error.message}`
          );
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }
  }

  /**
   * Download file from Bunny Storage
   */
  async download(filePath: string, retries = 3): Promise<Buffer> {
    const url = `${this.baseUrl}/${this.storageZone}${filePath}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            AccessKey: this.storageKey,
          },
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        logger.info(`✅ Downloaded from Bunny: ${filePath} (${Math.round(buffer.length / 1024 / 1024)}MB)`, {
          url,
        });
        return buffer;
      } catch (error) {
        logger.warn(
          `⚠️  Download attempt ${attempt}/${retries} failed: ${error.message}`,
          { filePath }
        );

        if (attempt === retries) {
          throw new Error(
            `Failed to download ${filePath} after ${retries} attempts: ${error.message}`
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }

    throw new Error(`Failed to download ${filePath}`);
  }

  /**
   * List files in directory
   */
  async list(dirPath: string): Promise<any[]> {
    const url = `${this.baseUrl}/${this.storageZone}${dirPath}/`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          AccessKey: this.storageKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const files = await response.json();
      logger.info(`✅ Listed files in ${dirPath}: ${Array.isArray(files) ? files.length : 0} items`);
      return Array.isArray(files) ? files : [];
    } catch (error) {
      logger.error(`Error listing ${dirPath}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Delete file from Bunny Storage
   */
  async delete(filePath: string, retries = 3): Promise<void> {
    const url = `${this.baseUrl}/${this.storageZone}${filePath}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            AccessKey: this.storageKey,
          },
          timeout: 30000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info(`✅ Deleted from Bunny: ${filePath}`);
        return;
      } catch (error) {
        logger.warn(
          `⚠️  Delete attempt ${attempt}/${retries} failed: ${error.message}`,
          { filePath }
        );

        if (attempt === retries) {
          throw new Error(
            `Failed to delete ${filePath} after ${retries} attempts: ${error.message}`
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }
  }

  /**
   * Get file info (size, date modified)
   */
  async getFileInfo(filePath: string): Promise<any> {
    try {
      const files = await this.list(path.dirname(filePath));
      const fileName = path.basename(filePath);
      return files.find((f: any) => f.ObjectName === fileName);
    } catch (error) {
      logger.error(`Error getting file info for ${filePath}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const info = await this.getFileInfo(filePath);
      return !!info;
    } catch {
      return false;
    }
  }

  /**
   * Get total storage used in zone
   */
  async getStorageStats(): Promise<{ used: number; limit: number }> {
    try {
      // This would require Bunny API call, simplified version
      const files = await this.list('/');
      const totalSize = files.reduce((sum: number, f: any) => sum + (f.Size || 0), 0);

      return {
        used: Math.round(totalSize / 1024 / 1024 / 1024), // GB
        limit: 0, // Unlimited
      };
    } catch (error) {
      logger.error('Error getting storage stats', { error: error.message });
      return { used: 0, limit: 0 };
    }
  }

  /**
   * Cleanup old backups (older than X days)
   */
  async cleanupOldBackups(daysToKeep: number = 30): Promise<number> {
    try {
      const backupDir = '/backups/mongodb';
      const files = await this.list(backupDir);

      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        if (!file.DateModified) continue;

        const fileDate = new Date(file.DateModified);
        if (fileDate < cutoffDate) {
          try {
            await this.delete(`${backupDir}/${file.ObjectName}`);
            deletedCount++;
          } catch (error) {
            logger.warn(`Failed to delete old backup: ${file.ObjectName}`, { error: error.message });
          }
        }
      }

      logger.info(`🧹 Cleaned up ${deletedCount} old backups (>= ${daysToKeep} days old)`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old backups', { error: error.message });
      return 0;
    }
  }
}

export default BunnyStorageClient;
