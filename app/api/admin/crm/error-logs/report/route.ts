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
    const body = await request.json();

    // Optional: Only log if we can connect to DB
    try {
      await connectDB();
      const ErrorLog = getErrorLog();

      // Extract request info
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';

      const userAgent = body.userAgent || request.headers.get('user-agent') || 'unknown';

      // Create error log document
      await ErrorLog.create({
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
    } catch (dbError) {
      // Log to console but don't fail the request
      console.error('[ErrorLog DB Write Failed]:', dbError instanceof Error ? dbError.message : dbError);
    }

    // Always return success to prevent error cascades
    return NextResponse.json({
      success: true,
      message: 'Error logged',
    });
  } catch (error) {
    console.error('[ErrorLog POST Error]:', error);
    // Fail silently for JSON parse errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
