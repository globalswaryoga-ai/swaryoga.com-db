/**
 * =====================================================
 * BACKUP NOTIFICATION SERVICE
 * =====================================================
 * Sends WhatsApp alerts (primary) + Email (optional)
 * for backup success, failure, and warnings.
 *
 * WhatsApp uses the existing bridge/Meta infrastructure.
 * Set BACKUP_ALERT_PHONE in env to receive WA alerts.
 * =====================================================
 */

import { logger } from './logger';

export interface NotificationPayload {
  type:
    | 'backup_success'
    | 'backup_error'
    | 'backup_warning'
    | 'restore_success'
    | 'restore_error';
  backupId?: string;
  result?: any;
  error?: string;
  details?: any;
}

// ─── WhatsApp alert ────────────────────────────────────────────────────────

async function sendWhatsAppAlert(message: string): Promise<void> {
  const alertPhone = process.env.BACKUP_ALERT_PHONE;
  if (!alertPhone) {
    logger.warn('⚠️  BACKUP_ALERT_PHONE not set — skipping WhatsApp alert');
    return;
  }

  const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || '').trim();
  const bridgeSecret = (process.env.WHATSAPP_BRIDGE_SECRET || '').trim();

  // Try WhatsApp Bridge (Baileys on EC2) first
  if (bridgeUrl && bridgeSecret) {
    try {
      const res = await fetch(`${bridgeUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': bridgeSecret,
        },
        body: JSON.stringify({ to: alertPhone, message }),
      });

      if (res.ok) {
        logger.info(`📱 WhatsApp alert sent via bridge to ${alertPhone}`);
        return;
      }
      logger.warn(`⚠️  WA bridge returned ${res.status}, trying Meta fallback...`);
    } catch (err) {
      logger.warn('⚠️  WA bridge failed, trying Meta fallback...', {
        error: (err as Error).message,
      });
    }
  }

  // Fallback: Meta Cloud API
  const metaToken = process.env.META_PAGE_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.META_FACEBOOK_PAGE_ID;

  if (metaToken && phoneNumberId) {
    try {
      const to = alertPhone.replace(/\D/g, '');
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (res.ok) {
        logger.info(`📱 WhatsApp alert sent via Meta to ${alertPhone}`);
        return;
      }
      logger.warn(`⚠️  Meta WA API returned ${res.status}`);
    } catch (err) {
      logger.warn('⚠️  Meta WA fallback failed', { error: (err as Error).message });
    }
  }

  logger.warn('⚠️  WhatsApp alert could not be delivered — no working WA channel');
}

// ─── Email alert (optional, if SMTP configured) ───────────────────────────

async function sendEmailAlert(subject: string, body: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const alertEmail = process.env.BACKUP_ALERT_EMAIL;

  if (!smtpUser || !smtpPass || !alertEmail) return; // silently skip if not configured

  try {
    // Dynamic import to avoid loading nodemailer when not needed
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@swaryoga.com',
      to: alertEmail,
      subject,
      html: `<pre style="font-family:monospace">${body}</pre>`,
    });
    logger.info(`📧 Email alert sent: ${subject}`);
  } catch (err) {
    logger.warn('⚠️  Email alert failed', { error: (err as Error).message });
  }
}

// ─── Format messages ───────────────────────────────────────────────────────

function formatWhatsAppMessage(payload: NotificationPayload): string {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  switch (payload.type) {
    case 'backup_success': {
      const r = payload.result;
      return (
        `✅ *Swaryoga Backup Success*\n` +
        `🕐 ${ts} IST\n` +
        `📦 ID: ${payload.backupId}\n` +
        `📊 Atlas: ${r?.mongodbSizeBefore} MB → ${r?.mongodbSizeAfter} MB\n` +
        `🗜️  Compressed: ${r?.compressedSizeMB} MB\n` +
        `🗂️  Logs archived: ${r?.archivedLogRecords}\n` +
        `⏱️  Duration: ${Math.round((r?.durationMs || 0) / 1000)}s\n` +
        `☁️  Bunny: ${r?.bunnyPath}`
      );
    }

    case 'backup_error': {
      return (
        `❌ *Swaryoga Backup FAILED*\n` +
        `🕐 ${ts} IST\n` +
        `📦 ID: ${payload.backupId || 'unknown'}\n` +
        `⚠️  Error: ${payload.error}\n` +
        `👉 Please check Vercel logs immediately.`
      );
    }

    case 'restore_success': {
      return (
        `✅ *Swaryoga Restore Complete*\n` +
        `🕐 ${ts} IST\n` +
        `📦 Backup ID: ${payload.backupId}`
      );
    }

    case 'restore_error': {
      return (
        `❌ *Swaryoga Restore FAILED*\n` +
        `🕐 ${ts} IST\n` +
        `⚠️  Error: ${payload.error}`
      );
    }

    default:
      return `ℹ️ Swaryoga Backup: ${payload.type} at ${ts}`;
  }
}

function formatEmailSubject(payload: NotificationPayload): string {
  const subjects: Record<string, string> = {
    backup_success: `✅ Backup Success — ${payload.backupId}`,
    backup_error: `❌ BACKUP FAILED — ${payload.backupId || 'unknown'}`,
    backup_warning: `⚠️ Backup Warning — ${payload.backupId}`,
    restore_success: `✅ Restore Complete — ${payload.backupId}`,
    restore_error: `❌ Restore Failed`,
  };
  return subjects[payload.type] || `Backup Alert — ${payload.type}`;
}

// ─── Public send function ──────────────────────────────────────────────────

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const waMessage = formatWhatsAppMessage(payload);
    const emailSubject = formatEmailSubject(payload);

    // Send both in parallel (both are non-blocking, errors are caught inside)
    await Promise.allSettled([
      sendWhatsAppAlert(waMessage),
      sendEmailAlert(emailSubject, waMessage),
    ]);
  } catch (err) {
    // Never let notification errors crash the backup
    logger.error('❌ Notification service error', { error: (err as Error).message });
  }
}

export default sendNotification;
