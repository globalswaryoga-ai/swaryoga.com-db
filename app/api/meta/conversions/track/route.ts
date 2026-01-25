/**
 * API Route: Track conversions via Meta Conversions API Gateway
 * POST /api/meta/conversions/track
 *
 * Gateway ID: 707598524418962
 * Pixel ID: 906922940547021
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  trackFormSubmission,
  trackPageView,
  trackPurchase,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackCustomEvent,
} from '@/lib/meta-conversions/api-gateway';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, data, userId } = body;

    // Get client IP and user agent for server-side tracking
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let result;

    switch (eventType) {
      case 'lead':
        result = await trackFormSubmission(data, clientIp, userAgent);
        break;

      case 'page_view':
        result = await trackPageView(data.pageUrl, userId, clientIp, userAgent);
        break;

      case 'purchase':
        result = await trackPurchase(data, clientIp, userAgent);
        break;

      case 'view_content':
        result = await trackViewContent(data, userId, clientIp, userAgent);
        break;

      case 'add_to_cart':
        result = await trackAddToCart(data, userId, clientIp, userAgent);
        break;

      case 'initiate_checkout':
        result = await trackInitiateCheckout(data, userId, clientIp, userAgent);
        break;

      case 'custom':
        result = await trackCustomEvent(
          data.eventName,
          data.eventData,
          data.userData,
          clientIp,
          userAgent
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        eventId: result.eventId,
        message: `${eventType} event tracked successfully`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in conversions API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Example usage from client:
 *
 * // Track form submission
 * await fetch('/api/meta/conversions/track', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     eventType: 'lead',
 *     data: {
 *       email: 'user@example.com',
 *       phone: '9876543210',
 *       firstName: 'John',
 *       lastName: 'Doe',
 *       workshopName: 'Beginner Yoga',
 *       workshopId: '507f1f77bcf86cd799439011'
 *     }
 *   })
 * });
 *
 * // Track purchase
 * await fetch('/api/meta/conversions/track', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     eventType: 'purchase',
 *     data: {
 *       email: 'user@example.com',
 *       orderId: 'order-123',
 *       amount: 500,
 *       currency: 'INR',
 *       items: [
 *         {
 *           id: 'yoga-class-1',
 *           name: 'Beginner Yoga Class',
 *           quantity: 1,
 *           price: 500
 *         }
 *       ]
 *     },
 *     userId: 'user-123'
 *   })
 * });
 */
