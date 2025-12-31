import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentLogs,
  getErrorSummary,
  getOperationMetrics,
  createErrorReport,
} from '@/lib/socialMediaErrorLogger';
import { verifyToken } from '@/lib/auth';

/**
 * Social Media Monitoring & Metrics Dashboard Endpoint
 * 
 * Provides real-time metrics on social media operations for admin monitoring
 * Available endpoints:
 * - ?view=dashboard (default) - Overall metrics
 * - ?view=logs - Recent operation logs
 * - ?view=errors - Error summary
 * - ?view=platform&platform=facebook - Platform-specific report
 */

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const view = request.nextUrl.searchParams.get('view') || 'dashboard';
    const platform = request.nextUrl.searchParams.get('platform');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 100);

    if (view === 'logs') {
      // Get recent logs
      const logs = getRecentLogs(limit);
      return NextResponse.json({
        success: true,
        data: {
          view: 'logs',
          count: logs.length,
          logs,
        },
      });
    }

    if (view === 'errors') {
      // Get error summary
      const timeWindow = parseInt(request.nextUrl.searchParams.get('timeWindow') || '60');
      const summary = getErrorSummary(timeWindow);
      return NextResponse.json({
        success: true,
        data: {
          view: 'errors',
          ...summary,
        },
      });
    }

    if (view === 'platform' && platform) {
      // Get platform-specific error report
      const accountId = request.nextUrl.searchParams.get('accountId');
      const report = createErrorReport(platform, accountId || undefined);
      return NextResponse.json({
        success: true,
        data: {
          view: 'platform',
          ...report,
        },
      });
    }

    // Default: dashboard view with all metrics
    return NextResponse.json({
      success: true,
      data: {
        view: 'dashboard',
        analytics: getOperationMetrics('analytics_sync'),
        publishing: getOperationMetrics('post_publish'),
        errors: getErrorSummary(60),
        recentLogs: getRecentLogs(10),
      },
    });
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
}
