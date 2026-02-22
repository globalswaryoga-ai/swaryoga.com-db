/**
 * POST /api/admin/crm/email/process-scheduled
 * Cron endpoint: processes scheduled email campaigns whose scheduledAt has passed.
 * Can be called by Vercel Cron, external cron, or manually.
 * 
 * Security: Requires either a valid admin token OR the CRON_SECRET header.
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailCampaign, getEmailLog, getLead } from '@/lib/schemas/enterpriseSchemas';
import { sendBulkEmails } from '@/lib/email';
import type { EmailRecipient, EmailAttachment } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for bulk sends

export async function POST(request: NextRequest) {
  try {
    // Auth: accept admin token OR cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization');
    
    let isAuthed = false;

    // Check admin token
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.slice(7));
      if (decoded?.isAdmin) isAuthed = true;
    }

    // Check cron secret
    const envCronSecret = process.env.CRON_SECRET;
    if (envCronSecret && cronSecret === `Bearer ${envCronSecret}`) {
      isAuthed = true;
    }

    if (!isAuthed) {
      return apiError('UNAUTHORIZED', 'Valid admin token or CRON_SECRET required');
    }

    await connectDB();
    const EmailCampaign = getEmailCampaign();
    const EmailLog = getEmailLog();
    const Lead = getLead();

    // Find campaigns that are scheduled and past their scheduledAt time
    const now = new Date();
    const pendingCampaigns = await EmailCampaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    }).lean();

    if (pendingCampaigns.length === 0) {
      return apiSuccess({ message: 'No scheduled campaigns to process', processed: 0 });
    }

    const results: Array<{ campaignId: string; subject: string; sent: number; failed: number }> = [];

    for (const campaign of pendingCampaigns as any[]) {
      try {
        // Mark as sending
        await EmailCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'sending' } });

        // Resolve recipient emails to full data from leads collection
        const recipientEmails: string[] = campaign.recipients || [];
        const leads = await Lead.find({ email: { $in: recipientEmails } }).lean();
        const leadsByEmail = new Map<string, any>();
        for (const lead of leads as any[]) {
          if (lead.email) leadsByEmail.set(lead.email, lead);
        }

        const emailRecipients: EmailRecipient[] = recipientEmails.map((email: string) => {
          const lead = leadsByEmail.get(email);
          return {
            email,
            name: lead?.name || 'Customer',
            leadId: lead?._id?.toString() || undefined,
            phone: lead?.phone || '',
          };
        });

        const attachments: EmailAttachment[] = campaign.attachments || [];

        const bulkResult = await sendBulkEmails(
          emailRecipients,
          campaign.subject,
          campaign.body,
          { attachments }
        );

        // Log entries
        const logEntries = bulkResult.results.map(result => ({
          campaignId: campaign._id,
          leadId: result.recipient.leadId,
          recipientEmail: result.recipient.email,
          recipientName: result.recipient.name,
          subject: campaign.subject,
          body: campaign.body,
          attachments,
          status: result.status === 'sent' ? 'sent' : 'failed',
          resendId: result.resendId,
          error: result.error,
          sentAt: result.sentAt,
          sentBy: campaign.createdBy || 'scheduler',
          source: 'bulk' as const,
        }));

        if (logEntries.length > 0) {
          await EmailLog.insertMany(logEntries);
        }

        // Update campaign
        await EmailCampaign.updateOne({ _id: campaign._id }, {
          $set: {
            status: bulkResult.failed === bulkResult.total ? 'failed' : 'sent',
            'stats.sent': bulkResult.sent,
            'stats.delivered': bulkResult.sent,
            'stats.failed': bulkResult.failed,
            sentAt: new Date(),
          },
        });

        results.push({
          campaignId: campaign._id.toString(),
          subject: campaign.subject,
          sent: bulkResult.sent,
          failed: bulkResult.failed,
        });
      } catch (err: any) {
        console.error(`[Scheduled Email] Campaign ${campaign._id} error:`, err);
        await EmailCampaign.updateOne({ _id: campaign._id }, { $set: { status: 'failed' } });
        results.push({
          campaignId: campaign._id.toString(),
          subject: campaign.subject,
          sent: 0,
          failed: (campaign.recipients || []).length,
        });
      }
    }

    return apiSuccess({
      message: `Processed ${results.length} scheduled campaign(s)`,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[Process Scheduled Emails] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to process scheduled emails');
  }
}
