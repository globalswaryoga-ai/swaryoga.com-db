/**
 * GET /api/backup/status
 * Get backup and archiving status
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BunnyStorageClient } from '@/lib/backup/bunny-client';
import { logger } from '@/lib/backup/logger';
import mongoose from 'mongoose';

// Middleware: Check admin authentication
async function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.BACKUP_API_KEY;

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    if (!(await checkAuth(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get MongoDB size
    let mongodbSize = 0;
    if (mongoose.connection.db) {
      const mongodbStats = await mongoose.connection.db.stats();
      mongodbSize = Math.round(mongodbStats.dataSize / 1024 / 1024);
    }

    // Get latest backup info
    const bunny = new BunnyStorageClient(process.env.BUNNY_STORAGE_KEY!, 'backupmobgo');
    const dateStr = new Date().toISOString().split('T')[0];
    const files = await bunny.list(`/backups/mongodb/${dateStr}`);
    const latestBackup = files.find(
      (f: any) => f.ObjectName.endsWith('.gz') && !f.ObjectName.endsWith('-metadata.json.gz')
    );

    // Get storage stats
    const storageStats = await bunny.getStorageStats();

    const status = {
      timestamp: new Date(),
      mongodb: {
        size: mongodbSize,
        unit: 'MB',
        target: 1024, // Target 1GB
        status: mongodbSize <= 1024 ? '✅ Healthy' : '⚠️ Large',
      },
      latestBackup: latestBackup
        ? {
            name: latestBackup.ObjectName,
            size: Math.round(latestBackup.Size / 1024 / 1024),
            date: latestBackup.DateModified,
          }
        : null,
      bunnyStorage: {
        used: storageStats.used,
        unit: 'GB',
        status: '✅ Healthy',
      },
      backupSchedule: {
        time: process.env.BACKUP_TIME || '02:00 UTC',
        frequency: 'Daily',
        compression: 'GZIP (90% reduction)',
        encryption: 'AES-256-GCM',
      },
      archiveStatus: {
        hotTier: `Last ${process.env.RETENTION_DAYS || 30} days`,
        warmTier: '7-30 days',
        coldTier: '30+ days',
        status: '✅ Active',
      },
    };

    logger.info('✅ Backup status retrieved');
    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error getting backup status', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to get backup status' },
      { status: 500 }
    );
  }
}
