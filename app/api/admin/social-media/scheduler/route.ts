import { NextRequest, NextResponse } from 'next/server';
import { checkAndPublishScheduledPosts, getSchedulerStatus } from '@/lib/socialMediaScheduler';

/**
 * Scheduled Post Publisher Cron Endpoint
 * 
 * This endpoint is meant to be called every 1-5 minutes by an external cron service like:
 * - EasyCron (https://www.easycron.com/)
 * - AWS CloudWatch Events
 * - Google Cloud Scheduler
 * - Or any service that can make HTTP requests on a schedule
 * 
 * For local development, you can call it manually or use a local cron service.
 * 
 * Environment: Set CRON_SECRET in .env.local to protect this endpoint
 */

export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized
    const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }

    // Get action from query parameter (default to publish)
    const action = request.nextUrl.searchParams.get('action') || 'publish';

    if (action === 'status') {
      // Return scheduler status without doing any publishing
      const status = await getSchedulerStatus();
      return NextResponse.json(status);
    }

    if (action === 'publish' || action === 'check') {
      // Check and publish scheduled posts
      const result = await checkAndPublishScheduledPosts();

      return NextResponse.json({
        success: true,
        message: `Checked ${result.totalChecked} posts. Published: ${result.published}, Failed: ${result.failed}`,
        data: result,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action. Use ?action=publish, status, or check' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for external cron services that prefer POST requests
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
