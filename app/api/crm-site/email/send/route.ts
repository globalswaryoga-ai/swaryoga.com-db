import { NextRequest, NextResponse } from 'next/server';
import {

export const dynamic = 'force-dynamic';

  EMAIL_LIMITS,
  replaceEmailVariables,
  generateTrackingPixel,
  wrapLinksForTracking,
} from '@/lib/crm-site/emailMarketingConfig';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import { resolveEmailPlanAccess, resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

/**
 * Email Send API
 * POST - Send/queue a campaign for sending
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const { campaignId, testEmail } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;

    // Get campaign
    const campaign = await crmDb.collection('email_campaigns').findOne({
      tenantSlug,
      id: campaignId,
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get tenant
    const plan = resolveTenantPlanAccess(tenant).plan;
    const limits = resolveEmailPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Email marketing is not enabled for this plan' }, { status: 403 });
    }

    // Check monthly limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEmailsSent = await crmDb.collection('email_events').countDocuments({
      tenantSlug,
      event: 'sent',
      timestamp: { $gte: startOfMonth },
    });

    // If it's a test email, just send one
    if (testEmail) {
      if (monthlyEmailsSent >= limits.monthlyEmails) {
        return NextResponse.json({
          error: 'Monthly email limit reached. Upgrade to send more emails.',
        }, { status: 403 });
      }

      // Queue test email
      await crmDb.collection('email_queue').insertOne({
        tenantSlug,
        campaignId,
        email: testEmail,
        leadId: 'test',
        subject: `[TEST] ${campaign.subject}`,
        body: campaign.body,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        status: 'pending',
        isTest: true,
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, queued: 1, isTest: true });
    }

    // Get target leads based on audience settings
    let leads: any[] = [];
    const audience = campaign.targetAudience || { type: 'all' };

    if (audience.type === 'list' && audience.leadIds?.length) {
      // Specific leads
      const { ObjectId } = mongoose.Types;
      leads = await crmDb.collection('leads').find({
        tenantSlug,
        _id: { $in: audience.leadIds.map((id: string) => {
          try { return new ObjectId(id); } catch { return id; }
        }) },
        email: { $exists: true, $ne: '' },
        unsubscribed: { $ne: true },
      }).toArray();
    } else if (audience.type === 'filtered' && audience.filters) {
      // Filtered leads
      const query: Record<string, any> = {
        tenantSlug,
        email: { $exists: true, $ne: '' },
        unsubscribed: { $ne: true },
      };

      if (audience.filters.status?.length) {
        query.status = { $in: audience.filters.status };
      }
      if (audience.filters.tags?.length) {
        query.tags = { $in: audience.filters.tags };
      }
      if (audience.filters.source?.length) {
        query.source = { $in: audience.filters.source };
      }
      if (audience.filters.assignedTo?.length) {
        query.assignedTo = { $in: audience.filters.assignedTo };
      }

      leads = await crmDb.collection('leads').find(query).toArray();
    } else {
      // All leads with email
      leads = await crmDb.collection('leads').find({
        tenantSlug,
        email: { $exists: true, $ne: '' },
        unsubscribed: { $ne: true },
      }).toArray();
    }

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads match the target audience' }, { status: 400 });
    }

    // Check if we have enough quota
    const remainingQuota = limits.monthlyEmails - monthlyEmailsSent;
    const emailsToSend = Math.min(leads.length, remainingQuota);

    if (emailsToSend === 0) {
      return NextResponse.json({
        error: 'Monthly email limit reached. Upgrade to send more emails.',
      }, { status: 403 });
    }

    // Get base URL for tracking
    const baseUrl = new URL(request.url).origin;

    // Queue emails
    const emailQueue = leads.slice(0, emailsToSend).map(lead => {
      // Replace variables
      let personalizedSubject = replaceEmailVariables(
        campaign.subject,
        lead,
        tenant || {},
        { name: campaign.fromName, email: campaign.fromEmail }
      );

      let personalizedBody = replaceEmailVariables(
        campaign.body,
        lead,
        tenant || {},
        { name: campaign.fromName, email: campaign.fromEmail }
      );

      // Add tracking if enabled
      if (limits.tracking) {
        // Add tracking pixel for opens
        personalizedBody += generateTrackingPixel(campaignId, lead._id.toString(), baseUrl);

        // Wrap links for click tracking
        personalizedBody = wrapLinksForTracking(
          personalizedBody,
          campaignId,
          lead._id.toString(),
          baseUrl
        );
      }

      // Add unsubscribe link
      const unsubscribeUrl = `${baseUrl}/api/crm-site/email/unsubscribe?t=${tenantSlug}&l=${lead._id}`;
      personalizedBody = personalizedBody.replace(
        /\{\{UNSUBSCRIBE_URL\}\}/g,
        unsubscribeUrl
      );

      return {
        tenantSlug,
        campaignId,
        email: lead.email,
        leadId: lead._id.toString(),
        subject: personalizedSubject,
        body: personalizedBody,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        status: 'pending',
        isTest: false,
        createdAt: new Date(),
      };
    });

    if (emailQueue.length > 0) {
      await crmDb.collection('email_queue').insertMany(emailQueue);
    }

    // Update campaign status
    await crmDb.collection('email_campaigns').updateOne(
      { id: campaignId, tenantSlug },
      {
        $set: {
          status: 'sending',
          'stats.total': emailQueue.length,
          sentAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      queued: emailQueue.length,
      totalLeads: leads.length,
      skipped: leads.length - emailQueue.length,
      quotaRemaining: remainingQuota - emailQueue.length,
    });
  } catch (err: any) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send campaign' }, { status: 500 });
  }
}
