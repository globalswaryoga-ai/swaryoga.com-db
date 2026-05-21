/**
 * GET /api/backup/daily-export
 * Get daily data export status and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { DailyExportService } from '@/lib/backup/daily-export';
import { logger } from '@/lib/backup/logger';

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

    const bunnyStorageKey = process.env.BUNNY_STORAGE_KEY;
    if (!bunnyStorageKey) {
      return NextResponse.json(
        { error: 'Bunny storage not configured' },
        { status: 500 }
      );
    }

    const exportService = new DailyExportService(bunnyStorageKey);
    const stats = await exportService.getExportStats();

    const status = {
      timestamp: new Date(),
      schedule: {
        frequency: 'Daily',
        time: '03:00 UTC',
        purpose: 'Export MongoDB collections to Bunny CDN for user access',
      },
      currentStats: stats,
      dataAccess: {
        endpoint: '/api/data/fetch-from-bunny',
        parameters: {
          collection: 'Collection name (e.g., Course, Workshop)',
          query: 'Optional search query',
          limit: 'Results per page (default 50)',
        },
        example: '/api/data/fetch-from-bunny?collection=Course&query=yoga&limit=20',
      },
      benefits: [
        '✅ Users fetch from CDN instead of MongoDB',
        '✅ Reduced Atlas load',
        '✅ Global performance improvement',
        '✅ Lower bandwidth costs',
      ],
    };

    logger.info('✅ Daily export status retrieved');
    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error getting daily export status', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to get daily export status' },
      { status: 500 }
    );
  }
}
