/**
 * Error Logs API — receives error reports from frontend error boundaries
 * and provides error dashboard data for Super Admin.
 *
 * POST — Log an error (no auth required — error boundaries can't guarantee auth)
 * GET  — Fetch error logs (Super Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logApiError, logWarning, getRecentErrors, getErrorStats } from '@/lib/error-logger';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


// Rate limit: max 30 error reports per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 30;
}

/**
 * POST — Log an error from frontend error boundaries.
 * Accepts unauthenticated requests (error boundaries may fire before auth is available).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
    }

    const body = await req.json();
    const { level, source, message, stack, url, userAgent, metadata } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'Missing message' }, { status: 400 });
    }

    // Try to extract userId from auth header if present
    let userId: string | undefined;
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const decoded = verifyToken(authHeader);
        userId = decoded?.userId;
      }
    } catch {}

    if (level === 'warning') {
      await logWarning(source || 'frontend', message, {
        userId,
        path: url,
        userAgent: userAgent || req.headers.get('user-agent') || undefined,
        metadata,
        ip,
      });
    } else {
      await logApiError(source || 'frontend', new Error(message), {
        userId,
        path: url,
        userAgent: userAgent || req.headers.get('user-agent') || undefined,
        metadata: { ...metadata, reportedStack: stack },
        ip,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Error Logs API] POST failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to log error' }, { status: 500 });
  }
}

/**
 * GET — Fetch error logs for the admin dashboard.
 * Super Admin only.
 *
 * Query params:
 *   ?limit=50        — max results
 *   ?level=critical  — filter by level
 *   ?source=qr       — filter by source (substring)
 *   ?hours=24        — errors from last N hours
 *   ?stats=true      — return aggregate stats instead of logs
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const wantStats = params.get('stats') === 'true';
    const hours = parseInt(params.get('hours') || '24');
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    if (wantStats) {
      const stats = await getErrorStats(since);
      return NextResponse.json({ success: true, data: stats });
    }

    const limit = Math.min(parseInt(params.get('limit') || '50'), 200);
    const level = params.get('level') as 'error' | 'critical' | 'warning' | null;
    const source = params.get('source') || undefined;

    const logs = await getRecentErrors({
      limit,
      level: level || undefined,
      source,
      since,
    });

    return NextResponse.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    console.error('[Error Logs API] GET failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}
