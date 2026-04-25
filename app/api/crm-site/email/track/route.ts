import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';


/**
 * Email Tracking Endpoint
 * Handles open tracking (via pixel) and click tracking (via redirect)
 * 
 * Query params:
 * - c: campaign ID
 * - l: lead ID
 * - e: event type (open/click)
 * - url: redirect URL (for clicks)
 */

// 1x1 transparent PNG
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get('c');
  const leadId = url.searchParams.get('l');
  const eventType = url.searchParams.get('e');
  const redirectUrl = url.searchParams.get('url');

  // Always try to record the event, even if params are incomplete
  if (campaignId && leadId && eventType) {
    try {
      await connectDB();
      const mongoose = (await import('mongoose')).default;
      const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

      // Get campaign to find tenant
      const campaign = await crmDb.collection('email_campaigns').findOne({ id: campaignId });

      if (campaign) {
        // Record the event
        await crmDb.collection('email_events').insertOne({
          campaignId,
          tenantSlug: campaign.tenantSlug,
          leadId,
          email: '', // Could look up from lead if needed
          event: eventType === 'click' ? 'clicked' : 'opened',
          link: redirectUrl || undefined,
          timestamp: new Date(),
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              undefined,
        });

        // Update campaign stats
        const statsField = eventType === 'click' ? 'stats.clicked' : 'stats.opened';
        await crmDb.collection('email_campaigns').updateOne(
          { id: campaignId },
          { $inc: { [statsField]: 1 } }
        );
      }
    } catch (err) {
      // Don't fail the request if tracking fails
      console.error('Tracking error:', err);
    }
  }

  // Handle response based on event type
  if (eventType === 'click' && redirectUrl) {
    // Redirect to the original URL
    return NextResponse.redirect(redirectUrl, 302);
  }

  // Return tracking pixel for open events
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(TRACKING_PIXEL.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
