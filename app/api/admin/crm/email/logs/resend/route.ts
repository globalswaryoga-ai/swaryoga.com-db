import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailLog } from '@/lib/schemas/enterpriseSchemas';
import { sendEmail, wrapInEmailTemplate, personalizeEmail, EmailAttachment } from '@/lib/email';
import { tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


// POST /api/admin/crm/email/logs/resend - Resend failed emails
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

    const canSendEmail = isSuperAdmin || 
                        hasPermission(decoded?.permissionsV2, 'email', 'send');

    if (!canSendEmail) {
      return apiError('FORBIDDEN', 'You do not have permission to resend emails');
    }

    const body = await request.json();
    const { logIds } = body;

    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'logIds array is required');
    }

    await connectDB();
    const EmailLog = getEmailLog();
    const tf = tenantFilter(decoded, 'sentBy');

    // Get the failed/bounced logs
    const logs = await EmailLog.find({
      _id: { $in: logIds },
      status: { $in: ['failed', 'bounced'] },
      ...tf,
    }).lean();

    if (logs.length === 0) {
      return apiSuccess({ message: 'No failed emails to resend', resent: 0, failed: 0 });
    }

    let resent = 0;
    let failed = 0;

    for (const log of logs as any[]) {
      try {
        const personalizedBody = personalizeEmail(log.body || '', {
          email: log.recipientEmail,
          name: log.recipientName,
        });
        const html = wrapInEmailTemplate(personalizedBody, log.subject);

        // Include original attachments if any
        const emailAttachments: EmailAttachment[] = Array.isArray(log.attachments)
          ? log.attachments.filter((a: any) => a.url && a.fileName)
          : [];

        const result = await sendEmail({
          to: log.recipientEmail,
          subject: log.subject,
          html,
          attachments: emailAttachments,
        });

        if (result.success) {
          resent++;
          await EmailLog.updateOne(
            { _id: log._id },
            { 
              $set: { 
                status: 'sent', 
                resendId: result.id, 
                error: null, 
                sentAt: new Date() 
              } 
            }
          );
        } else {
          failed++;
          await EmailLog.updateOne(
            { _id: log._id },
            { $set: { error: result.error || 'Resend failed' } }
          );
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err: any) {
        failed++;
        await EmailLog.updateOne(
          { _id: log._id },
          { $set: { error: err.message || 'Resend error' } }
        );
      }
    }

    return apiSuccess({
      message: `Resend complete: ${resent} sent, ${failed} failed`,
      resent,
      failed,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/crm/email/logs/resend] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to resend emails');
  }
}
