/**
 * GET /api/backup/status
 * ─────────────────────────────────────────────
 * Backup health dashboard.
 * Returns Atlas size, last backup file, Bunny storage usage,
 * and per-collection document counts.
 *
 * Auth: Bearer <BACKUP_API_KEY>
 * ─────────────────────────────────────────────
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BunnyStorageClient } from '@/lib/backup/bunny-client';
import { logger } from '@/lib/backup/logger';
import mongoose from 'mongoose';

function checkAuth(req: NextRequest): boolean {
  const apiKey = process.env.BACKUP_API_KEY;
  if (!apiKey) return false;
  return req.headers.get('authorization') === `Bearer ${apiKey}`;
}

// Collections we want to track for size monitoring
const TRACKED_COLLECTIONS = [
  'User',
  'CourseEnrollment',
  'Purchase',
  'Workshop',
  'RecordedCourse',
  'VideoWatchLog',
  'VideoAccessLog',
  'ViewTracking',
  'ErrorLog',
  'AdminSession',
  'Sadhana',
  'SadhanaParticipant',
];

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const bunny = new BunnyStorageClient(process.env.BUNNY_STORAGE_KEY!, 'backupmobgo');
    const today = new Date().toISOString().split('T')[0];        // YYYY-MM-DD
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // ─── 1. MongoDB Atlas size ───────────────────────────────────────────────
    let atlasSizeMB = 0;
    let atlasStorageMB = 0;
    try {
      const stats = await mongoose.connection.db!.stats();
      atlasSizeMB = Math.round(stats.dataSize / 1024 / 1024);
      atlasStorageMB = Math.round(stats.storageSize / 1024 / 1024);
    } catch { /* non-fatal */ }

    // ─── 2. Per-collection doc counts ────────────────────────────────────────
    const collections: Record<string, number> = {};
    for (const name of TRACKED_COLLECTIONS) {
      try {
        const model = mongoose.models[name];
        if (model) collections[name] = await model.countDocuments({});
      } catch { /* skip */ }
    }

    // ─── 3. Last backup file on Bunny ────────────────────────────────────────
    let lastBackup: {
      date: string;
      file: string;
      sizeMB: number;
      modified: string;
    } | null = null;

    for (const dateStr of [today, yesterday]) {
      try {
        const files = await bunny.list(`/backups/mongodb/${dateStr}`);
        const gz = files.filter(
          (f: any) =>
            (f.ObjectName || '').endsWith('.gz') &&
            !(f.ObjectName || '').endsWith('-metadata.json.gz')
        );
        if (gz.length > 0) {
          const latest = gz.sort((a: any, b: any) =>
            new Date(b.DateModified).getTime() - new Date(a.DateModified).getTime()
          )[0];
          lastBackup = {
            date: dateStr,
            file: latest.ObjectName,
            sizeMB: Math.round((latest.Size || 0) / 1024 / 1024),
            modified: latest.DateModified,
          };
          break;
        }
      } catch { /* skip */ }
    }

    // ─── 4. Last weekly snapshot ──────────────────────────────────────────────
    let lastWeeklySync: { file: string; sizeMB: number; modified: string } | null = null;
    try {
      const weeklyFiles = await bunny.list('/weekly-backups');
      if (Array.isArray(weeklyFiles) && weeklyFiles.length > 0) {
        const latest = weeklyFiles.sort((a: any, b: any) =>
          new Date(b.DateModified).getTime() - new Date(a.DateModified).getTime()
        )[0];
        lastWeeklySync = {
          file: latest.ObjectName,
          sizeMB: Math.round((latest.Size || 0) / 1024 / 1024),
          modified: latest.DateModified,
        };
      }
    } catch { /* skip */ }

    // ─── 5. Latest export snapshot on Bunny ──────────────────────────────────
    let lastExport: { date: string; fileCount: number } | null = null;
    try {
      const exportFiles = await bunny.list(`/data/history/${today}`);
      if (Array.isArray(exportFiles) && exportFiles.length > 0) {
        lastExport = { date: today, fileCount: exportFiles.length };
      } else {
        const exportFilesYest = await bunny.list(`/data/history/${yesterday}`);
        if (Array.isArray(exportFilesYest) && exportFilesYest.length > 0) {
          lastExport = { date: yesterday, fileCount: exportFilesYest.length };
        }
      }
    } catch { /* skip */ }

    // ─── 6. Build health status ───────────────────────────────────────────────
    const PLAN_MB = 5 * 1024; // 5 GB plan
    const usedPct = Math.round((atlasSizeMB / PLAN_MB) * 100);

    let healthStatus: 'healthy' | 'warning' | 'critical';
    if (usedPct >= 85) healthStatus = 'critical';
    else if (usedPct >= 65) healthStatus = 'warning';
    else healthStatus = 'healthy';

    const hoursAgoBackup = lastBackup
      ? Math.round((Date.now() - new Date(lastBackup.modified).getTime()) / 3600000)
      : null;
    const backupFresh = hoursAgoBackup !== null && hoursAgoBackup <= 26; // within 26 hours

    const response = {
      timestamp: new Date().toISOString(),
      overall: healthStatus,

      atlas: {
        dataSizeMB: atlasSizeMB,
        storageSizeMB: atlasStorageMB,
        planSizeMB: PLAN_MB,
        usedPercent: usedPct,
        status:
          healthStatus === 'critical'
            ? '🔴 Critical — above 85%'
            : healthStatus === 'warning'
            ? '🟡 Warning — above 65%'
            : '🟢 Healthy',
      },

      collections,

      backups: {
        lastDailyBackup: lastBackup
          ? { ...lastBackup, hoursAgo: hoursAgoBackup, fresh: backupFresh }
          : { status: '❌ No backup found for today or yesterday' },
        lastWeeklySync: lastWeeklySync || { status: '⚠️ No weekly sync found' },
        lastDailyExport: lastExport || { status: '⚠️ No export found for today or yesterday' },
      },

      schedule: {
        dailyBackup: '2:00 AM UTC daily (encrypt + compress → Bunny)',
        dailyExport: '3:00 AM UTC daily (plain JSON → Bunny /data/latest/ + /data/history/)',
        weeklySync: '4:00 AM UTC every Sunday (full snapshot + log cleanup)',
        logRetention: `${process.env.RETENTION_DAYS || 7} days in Atlas, then archived to Bunny`,
        exportHistory: '90 days of dated export history kept on Bunny',
      },

      notifications: {
        whatsApp: !!process.env.BACKUP_ALERT_PHONE,
        email: !!(process.env.SMTP_USER && process.env.BACKUP_ALERT_EMAIL),
      },
    };

    logger.info('📊 Backup status retrieved', { health: healthStatus, usedPct });
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting backup status', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get backup status' }, { status: 500 });
  }
}
