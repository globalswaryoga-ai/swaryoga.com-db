/**
 * Email Utility using Hostinger SMTP (nodemailer)
 * Provides reusable email sending functions for bulk emails, single emails, etc.
 * Falls back to Resend API if SMTP is not configured.
 */

import nodemailer from 'nodemailer';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailRecipient {
  email: string;
  name?: string;
  leadId?: string;
  phone?: string;
}

export interface EmailAttachment {
  fileName: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  fileType?: 'image' | 'video' | 'document';
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface BulkEmailResult {
  recipient: EmailRecipient;
  status: 'sent' | 'failed';
  resendId?: string;
  error?: string;
  sentAt?: Date;
}

export interface BulkSendSummary {
  total: number;
  sent: number;
  failed: number;
  results: BulkEmailResult[];
}

/**
 * Check if SMTP is configured (preferred method)
 */
function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Get the Resend API key from environment (fallback)
 */
function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Create a nodemailer SMTP transporter (Hostinger)
 */
function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Get the default from address
 */
function getFromAddress(): string {
  if (isSmtpConfigured()) {
    return process.env.EMAIL_FROM || `Swar Yoga <${process.env.SMTP_USER}>`;
  }
  return process.env.EMAIL_FROM || 'Swar Yoga <noreply@swaryoga.com>';
}

/**
 * Personalize email body with recipient variables
 */
export function personalizeEmail(body: string, recipient: EmailRecipient): string {
  return body
    .replace(/\{name\}/gi, recipient.name || 'Customer')
    .replace(/\{email\}/gi, recipient.email || '')
    .replace(/\{phone\}/gi, recipient.phone || '');
}

/**
 * Wrap plain text/HTML content in an email template
 */
export function wrapInEmailTemplate(content: string, subject: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
    .content { padding: 32px 24px; }
    .content p { margin: 0 0 16px; }
    .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { margin: 4px 0; font-size: 12px; color: #6c757d; }
    a { color: #667eea; }
    .btn { display: inline-block; padding: 12px 28px; background: #667eea; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="wrapper">
      <div class="header">
        <h1>🧘 Swar Yoga</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>🧘 Swar Yoga - Transform Your Life</p>
        <p><a href="https://swaryoga.com">www.swaryoga.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a single email via SMTP (Hostinger) or Resend API fallback
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  // Use SMTP if configured, otherwise fall back to Resend
  if (isSmtpConfigured()) {
    return sendEmailViaSMTP(options);
  }
  return sendEmailViaResend(options);
}

/**
 * Send email via Hostinger SMTP (nodemailer)
 */
async function sendEmailViaSMTP(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const transporter = createSmtpTransporter();

    // Build attachments for nodemailer (fetch remote URLs)
    let mailAttachments: Array<{ filename: string; content: Buffer }> | undefined;
    if (options.attachments && options.attachments.length > 0) {
      mailAttachments = [];
      for (const att of options.attachments) {
        try {
          const resp = await fetch(att.url);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            mailAttachments.push({ filename: att.fileName, content: buffer });
          } else {
            console.warn(`[Email/SMTP] Failed to fetch attachment ${att.fileName}: HTTP ${resp.status}`);
          }
        } catch (fetchErr) {
          console.warn(`[Email/SMTP] Failed to fetch attachment ${att.fileName}:`, fetchErr);
        }
      }
    }

    const info = await transporter.sendMail({
      from: options.from || getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || undefined,
      attachments: mailAttachments,
    });

    console.log('[Email/SMTP] Sent:', info.messageId);
    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error('[Email/SMTP] Send error:', error);
    return { success: false, error: error.message || 'SMTP error' };
  }
}

/**
 * Send email via Resend API (fallback)
 */
async function sendEmailViaResend(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const apiKey = getResendApiKey();

    // Build attachments array for Resend API (fetch remote URLs into base64)
    let resendAttachments: Array<{ filename: string; content: string }> | undefined;
    if (options.attachments && options.attachments.length > 0) {
      resendAttachments = [];
      for (const att of options.attachments) {
        try {
          const resp = await fetch(att.url);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            resendAttachments.push({
              filename: att.fileName,
              content: buffer.toString('base64'),
            });
          } else {
            console.warn(`[Email/Resend] Failed to fetch attachment ${att.fileName}: HTTP ${resp.status}`);
          }
        } catch (fetchErr) {
          console.warn(`[Email/Resend] Failed to fetch attachment ${att.fileName}:`, fetchErr);
        }
      }
    }

    const payload: any = {
      from: options.from || getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo || undefined,
    };
    if (resendAttachments && resendAttachments.length > 0) {
      payload.attachments = resendAttachments;
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Email/Resend] Send failed:', data);
      return { success: false, error: data?.message || data?.error || `HTTP ${response.status}` };
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error('[Email/Resend] Send error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Send bulk emails to multiple recipients with per-recipient tracking
 * Includes personalization of {name}, {email}, {phone} variables
 */
export async function sendBulkEmails(
  recipients: EmailRecipient[],
  subject: string,
  body: string,
  options?: { wrapTemplate?: boolean; delayMs?: number; attachments?: EmailAttachment[] }
): Promise<BulkSendSummary> {
  const results: BulkEmailResult[] = [];
  let sent = 0;
  let failed = 0;
  const wrapTemplate = options?.wrapTemplate ?? true;
  const delayMs = options?.delayMs ?? 200; // Rate limit: 200ms between sends

  for (const recipient of recipients) {
    try {
      const personalizedBody = personalizeEmail(body, recipient);
      const htmlContent = wrapTemplate ? wrapInEmailTemplate(personalizedBody, subject) : personalizedBody;
      const personalizedSubject = personalizeEmail(subject, recipient);

      const result = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: htmlContent,
        attachments: options?.attachments,
      });

      if (result.success) {
        sent++;
        results.push({
          recipient,
          status: 'sent',
          resendId: result.id,
          sentAt: new Date(),
        });
      } else {
        failed++;
        results.push({
          recipient,
          status: 'failed',
          error: result.error,
        });
      }

      // Rate limiting delay between sends
      if (delayMs > 0 && recipients.indexOf(recipient) < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      failed++;
      results.push({
        recipient,
        status: 'failed',
        error: error.message || 'Unknown error',
      });
    }
  }

  return { total: recipients.length, sent, failed, results };
}

/**
 * Send a single email to a lead (used from leads-followup page)
 */
export async function sendEmailToLead(
  recipient: EmailRecipient,
  subject: string,
  body: string,
  options?: { wrapTemplate?: boolean; attachments?: EmailAttachment[] }
): Promise<BulkEmailResult> {
  const wrapTemplate = options?.wrapTemplate ?? true;

  try {
    const personalizedBody = personalizeEmail(body, recipient);
    const htmlContent = wrapTemplate ? wrapInEmailTemplate(personalizedBody, subject) : personalizedBody;
    const personalizedSubject = personalizeEmail(subject, recipient);

    const result = await sendEmail({
      to: recipient.email,
      subject: personalizedSubject,
      html: htmlContent,
      attachments: options?.attachments,
    });

    return {
      recipient,
      status: result.success ? 'sent' : 'failed',
      resendId: result.id,
      error: result.error,
      sentAt: result.success ? new Date() : undefined,
    };
  } catch (error: any) {
    return {
      recipient,
      status: 'failed',
      error: error.message || 'Unknown error',
    };
  }
}
