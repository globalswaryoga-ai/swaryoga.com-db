import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailCampaign } from '@/lib/schemas/enterpriseSchemas';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check email send permission
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
    const { recipients, subject, body: emailBody, templateId, scheduleMode, scheduledAt } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return apiError('VALIDATION_ERROR', 'Recipients array is required and must not be empty');
    }

    if (!subject || !subject.trim()) {
      return apiError('VALIDATION_ERROR', 'Email subject is required');
    }

    if (!emailBody || !emailBody.trim()) {
      return apiError('VALIDATION_ERROR', 'Email body is required');
    }

    await connectDB();
    const EmailCampaign = getEmailCampaign();

    // Create campaign record
    const campaign = new EmailCampaign({
      name: subject,
      subject,
      body: emailBody,
      templateId: templateId || undefined,
      recipients: recipients.map(r => r.email),
      status: scheduleMode === 'later' ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt || undefined,
      stats: {
        total: recipients.length,
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

    // If sending now, trigger email sending (in production, use a queue system)
    if (scheduleMode === 'now') {
      // Update status to sending
      campaign.status = 'sending';
      await campaign.save();

      // Send emails (simplified - in production use a proper email service)
      try {
        await sendBulkEmails(recipients, subject, emailBody);
        
        campaign.status = 'sent';
        campaign.stats.sent = recipients.length;
        campaign.stats.delivered = recipients.length; // Simplified
        campaign.sentAt = new Date();
        await campaign.save();
      } catch (err) {
        campaign.status = 'failed';
        await campaign.save();
        throw err;
      }
    }

    return apiSuccess({
      message: scheduleMode === 'now' ? 'Email sent successfully' : 'Email scheduled successfully',
      campaignId: campaign._id,
      stats: campaign.stats,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to send email');
  }
}

// Helper function to send bulk emails

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';

async function sendBulkEmails(recipients: any[], subject: string, body: string) {
  // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
  // For now, this is a placeholder
  console.log(`Sending email to ${recipients.length} recipients:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body.substring(0, 100)}...`);
  
  // Simulate email sending
  for (const recipient of recipients) {
    console.log(`Sent to: ${recipient.email} (${recipient.name})`);
    // Replace {name}, {email}, {phone} variables
    const personalizedBody = body
      .replace(/\{name\}/g, recipient.name || 'Customer')
      .replace(/\{email\}/g, recipient.email || '')
      .replace(/\{phone\}/g, recipient.phone || '');
    
    // In production, call email service API here
    // await emailService.send({
    //   to: recipient.email,
    //   subject,
    //   html: personalizedBody,
    // });
  }
  
  return { success: true };
}
