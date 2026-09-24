/**
 * Daily Archive API
 * POST /api/admin/archive  → runs archive job immediately
 * GET  /api/admin/archive  → returns DB stats + archive log
 * 
 * This endpoint is called daily by Vercel Cron at midnight IST.
 * It can also be triggered manually from the admin dashboard.
 * 
 * Protect with ARCHIVE_SECRET header or admin JWT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyArchive, getDbStats } from '@/lib/bunnyArchiver';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (Vercel Pro limit)

export async function GET(req: NextRequest) {
  // Require admin JWT or archive secret
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const secret = req.headers.get('x-archive-secret');
  const isSecret = secret && secret === process.env.ARCHIVE_SECRET;
  const decoded = verifyToken(token);
  if (!decoded && !isSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getDbStats();

  // Recent archive log
  const logResult = await bunnyExecute({
    sql: `SELECT table_name, date_key, row_count, byte_size, archived_at, status
          FROM archive_log
          ORDER BY archived_at DESC
          LIMIT 50`,
    args: [],
  }).catch(() => ({ rows: [] }));

  return NextResponse.json({
    stats,
    recentArchives: logResult.rows,
    keepDays: parseInt(process.env.ARCHIVE_KEEP_DAYS || '30', 10),
  });
}

export async function POST(req: NextRequest) {
  // Require admin JWT or archive secret
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const secret = req.headers.get('x-archive-secret');
  const isSecret = secret && secret === process.env.ARCHIVE_SECRET;
  const decoded = verifyToken(token);
  if (!decoded && !isSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyArchive();
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[Archive API] Error:', err);
    return NextResponse.json({ error: err.message || 'Archive failed' }, { status: 500 });
  }
}
