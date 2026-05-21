/**
 * =====================================================
 * BACKUP SCHEDULER - Stub for Vercel Cron Jobs
 * =====================================================
 * Actual scheduling is handled by Vercel Cron in vercel.json
 * This class exists only for status reporting
 * =====================================================
 */

export class BackupScheduler {
  initialize(): void {
    // No-op: Vercel Cron Jobs handle the scheduling via vercel.json
    // See: /api/cron/backup, /api/cron/export, /api/cron/weekly-sync
  }

  stop(): void {
    // No-op
  }

  getStatus(): any {
    return {
      scheduler: 'Vercel Cron Jobs',
      jobs: [
        { name: 'Daily Backup',     schedule: '0 2 * * *',   endpoint: '/api/cron/backup' },
        { name: 'Daily Export',     schedule: '0 3 * * *',   endpoint: '/api/cron/export' },
        { name: 'Weekly Sync',      schedule: '0 2 * * 0',   endpoint: '/api/cron/weekly-sync' },
      ],
      timestamp: new Date(),
    };
  }
}

export default BackupScheduler;
