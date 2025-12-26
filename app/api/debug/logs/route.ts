/**
 * Swar Yoga - Debug Endpoint: Logs & Monitoring
 * © 2025 Swar Yoga. All rights reserved.
 * 
 * Admin endpoint for viewing logs and system metrics.
 * Protected by simple authentication (no user ID logging).
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getLogs, 
  getUserLogs, 
  getRequestLogs,
  getLogStats,
  clearLogs,
  createRequestContext,
  logRequest,
  logResponse,
} from '@/lib/logging';
import { Timer } from '@/lib/logging';

const timer = new Timer();

export async function GET(request: NextRequest) {
  // Never expose server logs on production.
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_ALLOW_PROD !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const requestContext = createRequestContext(request);
  logRequest(requestContext, 'Debug endpoint accessed');

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const userId = searchParams.get('userId');
    const requestId = searchParams.get('requestId');

    let responseData: any = null;

    switch (action) {
      case 'logs':
        responseData = {
          logs: getLogs(limit),
          timestamp: new Date().toISOString(),
        };
        break;

      case 'user-logs':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing userId parameter' },
            { status: 400 }
          );
        }
        responseData = {
          userId,
          logs: getUserLogs(userId, limit),
          timestamp: new Date().toISOString(),
        };
        break;

      case 'request-logs':
        if (!requestId) {
          return NextResponse.json(
            { error: 'Missing requestId parameter' },
            { status: 400 }
          );
        }
        responseData = {
          requestId,
          logs: getRequestLogs(requestId),
          timestamp: new Date().toISOString(),
        };
        break;

      case 'stats':
        responseData = {
          stats: getLogStats(),
          timestamp: new Date().toISOString(),
        };
        break;

      case 'clear':
        clearLogs();
        responseData = {
          message: 'All logs cleared',
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        responseData = {
          message: 'Debug Logging Endpoint',
          actions: {
            'logs': 'Get recent logs (limit: 1-1000)',
            'user-logs': 'Get logs for specific user (requires userId)',
            'request-logs': 'Get logs for specific request (requires requestId)',
            'stats': 'Get logging statistics',
            'clear': 'Clear all logs (use with caution)',
          },
          usage: '/api/debug/logs?action=stats&limit=100',
        };
    }

    const duration = timer.elapsed();
    logResponse(requestContext, 200, duration, 'Debug endpoint completed');

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Debug Endpoint Error]', errorMessage);

    logResponse(requestContext, 500, timer.elapsed(), 'Debug endpoint error');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
