import { NextRequest } from 'next/server';

import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/api-error';
import { saveEmailCampaign, saveEmailLog, saveEmailLogsBulk } from '@/lib/emailBunnyRepository';
import { sendBulkEmails, sendEmailToLead } from '@/lib/email';
import type { EmailRecipient, EmailAttachment } from '@/lib/email';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    const isSuperAdmin = decoded?.userId === 'admin' ||
                        decoded?.userId === 'admincrm' ||
                        (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));

    // Basic plan users (non-admin userId) have default email access
    if (!isSuperAdmin && decoded?.userId && !decoded?.isAdmin) {
      // Basic plan user - allow by default
    } else if (decoded?.isAdmin) {
      // Admin user - check permissions
      const canSendEmail = isSuperAdmin ||
                          (decoded?.permissions && Array.isArray(decoded.permissions) && decoded.permissions.includes('email')) ||
                          hasPermission(decoded?.permissionsV2, 'email', 'send');
      if (!canSendEmail) {
        return apiError('FORBIDDEN', 'You do not have permission to send emails');
      }
    }

    const body = await request.json();
    const { recipients, subject, body: emailBody, templateId, scheduleMode, scheduledAt, source, attachments } = body;

    // Normalize attachments
    const emailAttachments: EmailAttachment[] = Array.isArray(attachments) ? attachments.filter(
      (a: any) => a && a.url && a.fileName
    ) : [];

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return apiError('VALIDATION_ERROR', 'Recipients array is required and must not be empty');
    }

    // Filter out recipients without valid email addresses
    const validRecipients = recipients.filter((r: any) => r.email && r.email.trim());
    if (validRecipients.length === 0) {
      return apiError('VALIDATION_ERROR', 'No recipients with valid email addresses');
    }

    if (!subject || !subject.trim()) {
      return apiError('VALIDATION_ERROR', 'Email subject is required');
    }

    if (!emailBody || !emailBody.trim()) {
      return apiError('VALIDATION_ERROR', 'Email body is required');
    }



    // Single-email mode (from leads-followup page)
    if (source === 'followup' && validRecipients.length === 1) {
      const r = validRecipients[0];

      const recipient: EmailRecipient = {
        email: r.email,
        name: r.name || 'Customer',
        leadId: r.leadId,
        phone: r.phone || '',
      };

      const result = await sendEmailToLead(recipient, subject, emailBody, { attachments: emailAttachments });

      // Log the email
      await saveEmailLog({
        leadId: recipient.leadId,
        recipientEmail: recipient.email,
        subject,
        body: emailBody,
        attachments: emailAttachments,
        status: result.status === 'sent' ? 'sent' : 'failed',
        error: result.error,
        sentAt: result.sentAt,
        sentBy: decoded.userId || 'unknown'
      });

      if (result.status === 'failed') {
        return apiError('SERVER_ERROR', result.error || 'Failed to send email');
      }

      return apiSuccess({
        message: 'Email sent successfully',
        result,
      });
    }

    // Bulk email mode — create campaign record
    let campaign = await saveEmailCampaign({
      name: subject,
      subject,
      body: emailBody,
      templateId: templateId || null,
      recipients: validRecipients.map((r: any) => r.email),
      attachments: emailAttachments,
      status: scheduleMode === 'later' ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt || null,
      sentCount: 0,
      failedCount: 0,
      createdBy: decoded.userId || 'unknown'
    });

    // If sending now, send emails via Resend API
    if (scheduleMode === 'now') {
      campaign = await saveEmailCampaign({ ...campaign, status: 'sending' });

      try {
        const emailRecipients: EmailRecipient[] = validRecipients.map((r: any) => ({
          email: r.email,
          name: r.name,
          leadId: r.leadId,
          phone: r.phone,
        }));

        const bulkResult = await sendBulkEmails(emailRecipients, subject, emailBody, { attachments: emailAttachments });

        // Create email log entries for each recipient
        const logEntries = bulkResult.results.map(result => ({
          campaignId: campaign._id,
          leadId: result.recipient.leadId,
          recipientEmail: result.recipient.email,
          subject,
          body: emailBody,
          attachments: emailAttachments,
          status: result.status === 'sent' ? 'sent' : 'failed',
          error: result.error,
          sentAt: result.sentAt,
          sentBy: decoded.userId || 'unknown'
        }));
        if (logEntries.length > 0) {
          await saveEmailLogsBulk(logEntries);
        }

        // Update campaign stats
        campaign = await saveEmailCampaign({ ...campaign, status: bulkResult.failed === bulkResult.total ? 'failed' : 'sent', sentCount: bulkResult.sent, failedCount: bulkResult.failed, sentAt: new Date().toISOString() });

        return apiSuccess({
          message: `Email sent: ${bulkResult.sent} delivered, ${bulkResult.failed} failed`,
          campaignId: campaign._id,
          stats: { sent: campaign.sentCount, failed: campaign.failedCount },
          summary: {
            total: bulkResult.total,
            sent: bulkResult.sent,
            failed: bulkResult.failed,
          },
        });
      } catch (err: any) {
        campaign.status = 'failed';
        await campaign.save();
        console.error('Bulk email error:', err);
        return apiError('SERVER_ERROR', err.message || 'Failed to send bulk emails');
      }
    }

    return apiSuccess({
      message: 'Email campaign scheduled successfully',
      campaignId: campaign._id,
      stats: { sent: campaign.sentCount, failed: campaign.failedCount },
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to send email');
  }
}
