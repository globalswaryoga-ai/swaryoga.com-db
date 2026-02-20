import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailCampaign, getEmailLog } from '@/lib/schemas/enterpriseSchemas';
import { sendBulkEmails, sendEmailToLead } from '@/lib/email';
import type { EmailRecipient } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const isSuperAdmin = decoded?.userId === 'admin' || 
                        decoded?.userId === 'admincrm' ||
                        (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));
    
    const canSendEmail = isSuperAdmin || 
                        (decoded?.permissions && Array.isArray(decoded.permissions) && decoded.permissions.includes('email')) ||
                        hasPermission(decoded?.permissionsV2, 'email', 'send');

    if (!canSendEmail) {
      return apiError('FORBIDDEN', 'You do not have permission to send emails');
    }

    const body = await request.json();
    const { recipients, subject, body: emailBody, templateId, scheduleMode, scheduledAt, source } = body;

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

    await connectDB();
    const EmailCampaign = getEmailCampaign();
    const EmailLog = getEmailLog();

    // Single-email mode (from leads-followup page)
    if (source === 'followup' && validRecipients.length === 1) {
      const r = validRecipients[0];

      const recipient: EmailRecipient = {
        email: r.email,
        name: r.name || 'Customer',
        leadId: r.leadId,
        phone: r.phone || '',
      };

      const result = await sendEmailToLead(recipient, subject, emailBody);

      // Log the email
      await EmailLog.create({
        leadId: recipient.leadId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject,
        body: emailBody,
        status: result.status === 'sent' ? 'sent' : 'failed',
        resendId: result.resendId,
        error: result.error,
        sentAt: result.sentAt,
        sentBy: decoded.userId || 'unknown',
        source: 'followup',
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
    const campaign = new EmailCampaign({
      name: subject,
      subject,
      body: emailBody,
      templateId: templateId || undefined,
      recipients: validRecipients.map((r: any) => r.email),
      status: scheduleMode === 'later' ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt || undefined,
      stats: {
        total: validRecipients.length,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
      },
      createdBy: decoded.userId || 'unknown',
      createdAt: new Date(),
    });

    await campaign.save();

    // If sending now, send emails via Resend API
    if (scheduleMode === 'now') {
      campaign.status = 'sending';
      await campaign.save();

      try {
        const emailRecipients: EmailRecipient[] = validRecipients.map((r: any) => ({
          email: r.email,
          name: r.name,
          leadId: r.leadId,
          phone: r.phone,
        }));

        const bulkResult = await sendBulkEmails(emailRecipients, subject, emailBody);

        // Create email log entries for each recipient
        const logEntries = bulkResult.results.map(result => ({
          campaignId: campaign._id,
          leadId: result.recipient.leadId,
          recipientEmail: result.recipient.email,
          recipientName: result.recipient.name,
          subject,
          body: emailBody,
          status: result.status === 'sent' ? 'sent' : 'failed',
          resendId: result.resendId,
          error: result.error,
          sentAt: result.sentAt,
          sentBy: decoded.userId || 'unknown',
          source: 'bulk' as const,
        }));

        if (logEntries.length > 0) {
          await EmailLog.insertMany(logEntries);
        }

        // Update campaign stats
        campaign.status = bulkResult.failed === bulkResult.total ? 'failed' : 'sent';
        campaign.stats.sent = bulkResult.sent;
        campaign.stats.delivered = bulkResult.sent;
        campaign.stats.failed = bulkResult.failed;
        campaign.sentAt = new Date();
        await campaign.save();

        return apiSuccess({
          message: `Email sent: ${bulkResult.sent} delivered, ${bulkResult.failed} failed`,
          campaignId: campaign._id,
          stats: campaign.stats,
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
      stats: campaign.stats,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to send email');
  }
}
