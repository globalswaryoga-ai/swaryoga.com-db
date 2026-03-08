import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { resubscribeWABAWebhooks } from '@/lib/whatsapp';
import { apiError, apiSuccess } from '@/lib/api-error';

/**
 * POST /api/admin/crm/whatsapp/resubscribe
 *
 * Re-subscribe the app to WABA webhooks.
 * Use this endpoint if Meta stops delivering webhook events
 * (often caused by temporary server errors during deployments).
 *
 * Requires admin auth.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const decoded = verifyToken(authHeader ?? undefined);
    if (!decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    const result = await resubscribeWABAWebhooks();

    if (result.success) {
      return apiSuccess({
        resubscribed: true,
        message: 'WABA webhook subscription refreshed successfully',
      });
    }

    return apiError(result.error || 'Re-subscribe failed', 502);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(msg, 500);
  }
}

/**
 * GET /api/admin/crm/whatsapp/resubscribe
 *
 * Check WABA webhook subscription freshness by looking at
 * the most recent webhook event time.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const decoded = verifyToken(authHeader ?? undefined);
    if (!decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();

    const { getWhatsAppWebhookEvent } = await import('@/lib/schemas/enterpriseSchemas');
    const WhatsAppWebhookEvent = getWhatsAppWebhookEvent();

    // Find the most recent REAL webhook event (inbound_message or status_update)
    const lastRealEvent = await WhatsAppWebhookEvent.findOne(
      { kind: { $in: ['inbound_message', 'status_update'] } },
      { receivedAt: 1, kind: 1, phoneNumber: 1 },
      { sort: { receivedAt: -1 } }
    ).lean();

    const lastEventTime = lastRealEvent
      ? (lastRealEvent as any).receivedAt
      : null;

    const minutesSinceLastEvent = lastEventTime
      ? Math.round((Date.now() - new Date(lastEventTime).getTime()) / 60000)
      : null;

    // If no events in 2+ hours, it's likely paused
    const isHealthy = minutesSinceLastEvent !== null && minutesSinceLastEvent < 120;

    return apiSuccess({
      healthy: isHealthy,
      lastEvent: lastEventTime,
      minutesSinceLastEvent,
      recommendation: !isHealthy
        ? 'Webhook delivery may be paused. POST to this endpoint to re-subscribe.'
        : 'Webhook delivery is healthy.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(msg, 500);
  }
}
