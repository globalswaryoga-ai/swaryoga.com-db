import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import {
  EMAIL_LIMITS,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS,
  DEFAULT_TEMPLATES,
} from '@/lib/crm-site/emailMarketingConfig';
import { resolveEmailPlanAccess, resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

/**
 * Email Campaigns API
 * GET - List campaigns
 * POST - Create campaign
 * PATCH - Update campaign
 * DELETE - Delete campaign
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const campaignId = url.searchParams.get('id');

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Get tenant plan
    const plan = resolveTenantPlanAccess(tenant).plan;
    const limits = resolveEmailPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Email marketing is not enabled for this plan' }, { status: 403 });
    }

    if (campaignId) {
      // Get single campaign with stats
      const campaign = await crmDb.collection('email_campaigns').findOne({
        tenantSlug,
        id: campaignId,
      });

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      // Get recent events for this campaign
      const events = await crmDb.collection('email_events')
        .find({ campaignId, tenantSlug })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      return NextResponse.json({ campaign, events });
    }

    // List all campaigns
    const campaigns = await crmDb.collection('email_campaigns')
      .find({ tenantSlug })
      .sort({ createdAt: -1 })
      .toArray();

    // Get monthly email usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEmailsSent = await crmDb.collection('email_events').countDocuments({
      tenantSlug,
      event: 'sent',
      timestamp: { $gte: startOfMonth },
    });

    return NextResponse.json({
      campaigns,
      plan,
      limits,
      usage: {
        campaigns: campaigns.length,
        maxCampaigns: limits.campaigns,
        canCreate: campaigns.length < limits.campaigns,
        monthlyEmails: {
          sent: monthlyEmailsSent,
          limit: limits.monthlyEmails,
          remaining: Math.max(0, limits.monthlyEmails - monthlyEmailsSent),
        },
      },
      campaignTypes: CAMPAIGN_TYPES,
      campaignStatus: CAMPAIGN_STATUS,
    });
  } catch (err: any) {
    console.error('Campaigns GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 });
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

    const { crmDb, decoded, tenant, tenantSlug } = access;
    const {
      name,
      type = 'broadcast',
      templateId,
      subject,
      body: emailBody,
      previewText,
      fromName,
      fromEmail,
      replyTo,
      targetAudience,
      scheduledAt,
      dripSettings,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    // Get tenant and check limits
    const plan = resolveTenantPlanAccess(tenant).plan;
    const limits = resolveEmailPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Email marketing is not enabled for this plan' }, { status: 403 });
    }

    // Check campaign limit
    const existingCount = await crmDb.collection('email_campaigns').countDocuments({ tenantSlug });
    if (existingCount >= limits.campaigns) {
      return NextResponse.json({
        error: `Maximum ${limits.campaigns} campaigns allowed on ${plan} plan`,
      }, { status: 403 });
    }

    // Check feature access
    if (type === 'drip' && !limits.drip) {
      return NextResponse.json({
        error: 'Drip campaigns are not available on your plan. Upgrade to use this feature.',
      }, { status: 403 });
    }

    if (scheduledAt && !limits.scheduling) {
      return NextResponse.json({
        error: 'Email scheduling is not available on your plan. Upgrade to use this feature.',
      }, { status: 403 });
    }

    // Get template if specified
    let finalSubject = subject;
    let finalBody = emailBody;

    if (templateId) {
      // Check default templates first
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateId);
      if (defaultTemplate) {
        finalSubject = finalSubject || defaultTemplate.subject;
        finalBody = finalBody || defaultTemplate.body;
      } else {
        // Check custom templates
        const template = await crmDb.collection('email_templates').findOne({
          tenantSlug,
          id: templateId,
        });
        if (template) {
          finalSubject = finalSubject || template.subject;
          finalBody = finalBody || template.body;
        }
      }
    }

    const campaign = {
      id: uuidv4(),
      tenantSlug,
      name: name.trim(),
      type,
      status: scheduledAt ? 'scheduled' : 'draft',
      templateId,
      subject: finalSubject || '',
      body: finalBody || '',
      previewText: previewText || '',
      fromName: fromName || tenant?.name || '',
      fromEmail: fromEmail || tenant?.ownerEmail || '',
      replyTo: replyTo || '',
      targetAudience: targetAudience || { type: 'all' },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      dripSettings: dripSettings || null,
      stats: {
        total: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (decoded as any).userId || (decoded as any).email,
    };

    await crmDb.collection('email_campaigns').insertOne(campaign);

    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    console.error('Campaigns POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    // Build update object
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'name', 'subject', 'body', 'previewText', 'fromName', 'fromEmail', 
      'replyTo', 'targetAudience', 'scheduledAt', 'dripSettings', 'status'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    }

    // Handle date conversion
    if (updateFields.scheduledAt) {
      updateFields.scheduledAt = new Date(updateFields.scheduledAt);
    }

    const result = await crmDb.collection('email_campaigns').findOneAndUpdate(
      { tenantSlug, id: campaignId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign: result });
  } catch (err: any) {
    console.error('Campaigns PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update campaign' }, { status: 500 });
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
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    // Check if campaign is in safe state to delete
    const campaign = await crmDb.collection('email_campaigns').findOne({
      tenantSlug,
      id: campaignId,
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'sending') {
      return NextResponse.json({
        error: 'Cannot delete a campaign that is currently sending',
      }, { status: 400 });
    }

    await crmDb.collection('email_campaigns').deleteOne({ tenantSlug, id: campaignId });

    // Also delete events
    await crmDb.collection('email_events').deleteMany({ tenantSlug, campaignId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Campaigns DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete campaign' }, { status: 500 });
  }
}
