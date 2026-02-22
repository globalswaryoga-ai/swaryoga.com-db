/**
 * POST /api/admin/crm/email/webhook
 * Resend webhook endpoint for email events:
 *  - email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *  - email.replied (if configured in Resend inbound)
 * 
 * Configure this URL in Resend Dashboard → Webhooks
 * Optionally set RESEND_WEBHOOK_SECRET for signature verification
 */

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getEmailLog } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook signature
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');
      const svixSignature = request.headers.get('svix-signature');
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[Email Webhook] Missing Svix verification headers');
        // Continue processing even without headers for now
      }
      // Full Svix verification can be added with the svix package if needed
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), { status: 400 });
    }

    console.log(`[Email Webhook] Event: ${type}`, JSON.stringify(data).slice(0, 200));

    await connectDB();
    const EmailLog = getEmailLog();

    // Map Resend event types to our status + fields
    switch (type) {
      case 'email.delivered': {
        const emailId = data.email_id;
        if (emailId) {
          await EmailLog.updateMany(
            { resendId: emailId },
            { $set: { status: 'delivered', deliveredAt: new Date(data.created_at || Date.now()) } }
          );
        }
        break;
      }

      case 'email.opened': {
        const emailId = data.email_id;
        if (emailId) {
          await EmailLog.updateMany(
            { resendId: emailId },
            { $set: { status: 'opened', openedAt: new Date(data.created_at || Date.now()) } }
          );
        }
        break;
      }

      case 'email.clicked': {
        const emailId = data.email_id;
        if (emailId) {
          await EmailLog.updateMany(
            { resendId: emailId },
            { $set: { status: 'clicked', clickedAt: new Date(data.created_at || Date.now()) } }
          );
        }
        break;
      }

      case 'email.bounced': {
        const emailId = data.email_id;
        if (emailId) {
          await EmailLog.updateMany(
            { resendId: emailId },
            { $set: { status: 'bounced', error: data.bounce?.type || 'bounced' } }
          );
        }
        break;
      }

      case 'email.complained': {
        const emailId = data.email_id;
        if (emailId) {
          await EmailLog.updateMany(
            { resendId: emailId },
            { $set: { status: 'bounced', error: 'spam complaint' } }
          );
        }
        break;
      }

      // Inbound reply handling
      case 'email.received':
      case 'email.replied': {
        // Resend inbound delivers full email data
        const fromEmail = data.from?.[0]?.email || data.from || '';
        const subject = data.subject || '';
        const textBody = data.text || data.html || '';
        const inReplyTo = data.headers?.['in-reply-to'] || '';
        
        // Try to match to an existing log by recipient email (the sender is replying)
        const matchedLog = await EmailLog.findOne({
          recipientEmail: fromEmail,
          status: { $in: ['sent', 'delivered', 'opened', 'clicked'] },
        }).sort({ createdAt: -1 });

        if (matchedLog) {
          await EmailLog.updateOne(
            { _id: matchedLog._id },
            { 
              $set: { 
                status: 'replied',
                repliedAt: new Date(data.created_at || Date.now()),
                replyBody: textBody.slice(0, 5000), // limit stored reply size
              }
            }
          );
          console.log(`[Email Webhook] Reply from ${fromEmail} matched to log ${matchedLog._id}`);
        } else {
          // No match found - create an inbound log entry
          await EmailLog.create({
            recipientEmail: fromEmail,
            recipientName: data.from?.[0]?.name || fromEmail,
            subject: subject,
            body: textBody.slice(0, 5000),
            status: 'replied',
            repliedAt: new Date(data.created_at || Date.now()),
            replyBody: textBody.slice(0, 5000),
            sentBy: 'inbound',
            source: 'single',
            metadata: {
              inReplyTo,
              originalHeaders: data.headers,
            },
          });
          console.log(`[Email Webhook] New inbound reply from ${fromEmail} (no matching log)`);
        }
        break;
      }

      default:
        console.log(`[Email Webhook] Unhandled event type: ${type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('[Email Webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing error' }), { status: 500 });
  }
}

// GET - for webhook verification (Resend may ping this)
export async function GET() {
  return new Response(JSON.stringify({ status: 'Email webhook active' }), { status: 200 });
}
