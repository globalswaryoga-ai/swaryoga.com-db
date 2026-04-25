import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm-site/webhooks
 * List webhooks for a tenant
 * 
 * POST /api/crm-site/webhooks
 * Create/update webhook
 * 
 * DELETE /api/crm-site/webhooks
 * Delete a webhook
 */

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.updated',
  'lead.deleted',
  'lead.status_changed',
  'message.received',
  'message.sent',
  'broadcast.completed',
  'payment.received',
  'subscription.updated',
];

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const webhooks = await crmDb.collection('tenant_webhooks').find({ tenantSlug }).toArray();

    return NextResponse.json({
      webhooks: webhooks.map(w => ({
        id: w._id,
        url: w.url,
        events: w.events,
        enabled: w.enabled,
        secretPrefix: w.secret?.substring(0, 12) + '...',
        createdAt: w.createdAt,
        lastTriggeredAt: w.lastTriggeredAt,
        successCount: w.successCount || 0,
        failureCount: w.failureCount || 0,
      })),
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (err: any) {
    console.error('Webhooks GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, decoded, tenantSlug } = access;
    const { url, events = [], enabled = true, webhookId } = body;

    if (!url) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }


    const mongoose = (await import('mongoose')).default;
    const { ObjectId } = mongoose.Types;

    if (webhookId) {
      // Update existing webhook
      await crmDb.collection('tenant_webhooks').updateOne(
        { _id: new ObjectId(webhookId), tenantSlug },
        { $set: { url, events, enabled, updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: 'Webhook updated' });
    } else {
      // Create new webhook
      const secret = generateWebhookSecret();

      const result = await crmDb.collection('tenant_webhooks').insertOne({
        tenantSlug,
        url,
        events,
        enabled,
        secret,
        createdBy: (decoded as any).userId || (decoded as any).email,
        createdAt: new Date(),
        successCount: 0,
        failureCount: 0,
      });

      return NextResponse.json({
        success: true,
        webhookId: result.insertedId,
        secret, // Return secret only once
        message: 'Save this webhook secret. It will not be shown again.',
      });
    }
  } catch (err: any) {
    console.error('Webhooks POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save webhook' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json({ error: 'webhookId required' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const { ObjectId } = mongoose.Types;

    await crmDb.collection('tenant_webhooks').deleteOne({
      _id: new ObjectId(webhookId),
      tenantSlug,
    });

    return NextResponse.json({ success: true, message: 'Webhook deleted' });
  } catch (err: any) {
    console.error('Webhooks DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete webhook' }, { status: 500 });
  }
}
