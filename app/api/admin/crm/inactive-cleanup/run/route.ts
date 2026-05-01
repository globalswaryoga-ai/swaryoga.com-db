/**
 * GET /api/admin/crm/inactive-cleanup/run
 * Preview: dry-run showing what would be deleted (super admin only)
 *
 * POST /api/admin/crm/inactive-cleanup/run
 * Execute: run the full cleanup (super admin OR Vercel Cron internal token)
 *
 * Automatically called daily at 2 AM UTC via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { runInactiveAccountCleanup, getCleanupPreview } from '@/lib/crm/inactiveAccountScheduler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // DRY RUN - Requires super admin OR Vercel Cron secret
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;

    // Check auth: super admin OR Vercel cron with correct secret
    let isAuthorized = false;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Vercel Cron authorization
      isAuthorized = true;
    } else {
      // Super admin authorization
      const token = authHeader.slice('Bearer '.length);
      const decoded = verifyToken(token);
      isAuthorized = decoded && isSuperAdmin(decoded);
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required or invalid CRON_SECRET' },
        { status: 403 }
      );
    }

    const preview = await getCleanupPreview();

    return NextResponse.json(
      {
        success: true,
        dryRun: true,
        message: 'Cleanup preview (no data deleted)',
        preview: preview,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Inactive Cleanup] GET error:', error);
    return NextResponse.json(
      {
        error: 'Preview failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // EXECUTE CLEANUP - Requires super admin OR Vercel Cron secret
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;

    // Check auth: super admin OR Vercel cron with correct secret
    let isAuthorized = false;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Vercel Cron authorization
      isAuthorized = true;
    } else {
      // Super admin authorization
      const token = authHeader.slice('Bearer '.length);
      const decoded = verifyToken(token);
      isAuthorized = decoded && isSuperAdmin(decoded);
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Super admin access required or invalid CRON_SECRET' },
        { status: 403 }
      );
    }

    // Execute the cleanup
    const summary = await runInactiveAccountCleanup(false);

    return NextResponse.json(
      {
        success: true,
        dryRun: false,
        message: 'Inactive account cleanup executed',
        summary: summary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Inactive Cleanup] POST error:', error);
    return NextResponse.json(
      {
        error: 'Cleanup execution failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
