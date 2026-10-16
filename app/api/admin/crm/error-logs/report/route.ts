export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

/**
 * POST /api/admin/crm/error-logs/report
 * Accepts error reports from frontend error boundary and global handlers.
 * Connected to Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    try {
      await bunnyExecute(`CREATE TABLE IF NOT EXISTS error_logs_sql (
        id TEXT PRIMARY KEY,
        level TEXT,
        source TEXT,
        message TEXT,
        stack TEXT,
        path TEXT,
        method TEXT,
        status_code INTEGER,
        user_id TEXT,
        user_agent TEXT,
        ip TEXT,
        context_json TEXT,
        created_at TEXT NOT NULL
      )`);

      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';

      const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown';
      const id = 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const nowIso = new Date(body.timestamp || Date.now()).toISOString();

      await bunnyExecute({
        sql: `INSERT INTO error_logs_sql (id, level, source, message, stack, path, method, status_code, user_id, user_agent, ip, context_json, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          body.level || 'error',
          body.source || 'unknown',
          body.message || '',
          body.stack || '',
          body.path || '/',
          body.method || null,
          body.statusCode || null,
          body.userId || null,
          userAgent,
          ip,
          JSON.stringify(body.context || body.response || {}),
          nowIso,
        ],
      });
    } catch (dbError) {
      console.error('[ErrorLog DB Write Failed]:', dbError instanceof Error ? dbError.message : dbError);
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged',
    });
  } catch (error) {
    console.error('[ErrorLog POST Error]:', error);
    return NextResponse.json({
      success: true,
      message: 'Error logged (fallback)',
    });
  }
}
