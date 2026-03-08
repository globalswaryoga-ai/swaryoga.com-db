import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import {
  EMAIL_LIMITS,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS,
  DEFAULT_TEMPLATES,
} from '@/lib/crm-site/emailMarketingConfig';

/**
 * Email Campaigns API
 * GET - List campaigns
 * POST - Create campaign
 * PATCH - Update campaign
 * DELETE - Delete campaign
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant') || (decoded as any).tenantSlug;
    const campaignId = url.searchParams.get('id');

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const plan = tenant?.plan || 'free';
    const limits = EMAIL_LIMITS[plan] || EMAIL_LIMITS.free;

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantSlug,
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

    if (!tenantSlug || !name) {
      return NextResponse.json({ error: 'tenantSlug and name required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant and check limits
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const plan = tenant?.plan || 'free';
    const limits = EMAIL_LIMITS[plan] || EMAIL_LIMITS.free;

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, campaignId, ...updates } = body;

    if (!tenantSlug || !campaignId) {
      return NextResponse.json({ error: 'tenantSlug and campaignId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, campaignId } = body;

    if (!tenantSlug || !campaignId) {
      return NextResponse.json({ error: 'tenantSlug and campaignId required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

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
