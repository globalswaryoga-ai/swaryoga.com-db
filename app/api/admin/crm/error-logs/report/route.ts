import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getErrorLog } from '@/lib/schemas/recordedCourseSchemas';

/**
 * POST /api/admin/crm/error-logs/report
 *
 * Accepts error reports from:
 * - Frontend error boundary
 * - Global error handlers
 * - API error interceptors
 * - Performance monitors
 *
 * No auth required for frontend errors (IP-based identification)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const ErrorLog = getErrorLog();

    // Extract request info
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown';

    // Create error log document
    const errorLog = await ErrorLog.create({
      level: body.level || 'error',
      source: body.source || 'unknown',
      message: body.message,
      stack: body.stack,
      path: body.path || '/',
      method: body.method,
      statusCode: body.statusCode,
      userId: body.userId,
      userAgent,
      ip,
      response: body.response,
      context: body.context,
      timestamp: new Date(body.timestamp || Date.now()),
      resolved: false,
    });

    return NextResponse.json({
      success: true,
      errorId: errorLog._id,
      message: 'Error logged successfully',
    });
  } catch (error) {
    console.error('Error logging failed:', error);

    // Don't expose internal errors
    return NextResponse.json({
      success: false,
      message: 'Failed to log error',
    }, { status: 500 });
  }
}
