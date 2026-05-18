/**
 * Notification Service for Backup Events
 * Sends email/Slack alerts for backup status
 */

import { logger } from './logger';
import nodemailer from 'nodemailer';

interface NotificationPayload {
  type: 'backup_success' | 'backup_error' | 'backup_warning' | 'restore_success' | 'restore_error';
  backupId?: string;
  result?: any;
  error?: string;
  details?: any;
}

class NotificationService {
  private emailTransporter: any;
  private slackWebhook: string | null;

  constructor() {
    this.initializeEmail();
    this.initializeSlack();
  }

  private initializeEmail() {
    const emailConfig = {
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(emailConfig);
      logger.info('✅ Email transporter initialized');
    }
  }

  private initializeSlack() {
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL || null;
    if (this.slackWebhook) {
      logger.info('✅ Slack webhook configured');
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      // Send email
      if (this.emailTransporter) {
        await this.sendEmail(payload);
      }

      // Send to Slack
      if (this.slackWebhook) {
        await this.sendSlack(payload);
      }

      // Log to database (optional)
      await this.logToDatabase(payload);
    } catch (error) {
      logger.error('Error sending notification', { error: error.message, payload });
    }
  }

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    try {
      const { subject, html } = this.formatEmail(payload);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@swaryoga.com',
        to: process.env.BACKUP_ALERT_EMAIL || 'admin@swaryoga.com',
        subject,
        html,
      });

      logger.info(`✅ Email notification sent: ${subject}`);
    } catch (error) {
      logger.error('Failed to send email notification', { error: error.message });
    }
  }

  private async sendSlack(payload: NotificationPayload): Promise<void> {
    try {
      const message = this.formatSlack(payload);

      const response = await fetch(this.slackWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}`);
      }

      logger.info(`✅ Slack notification sent`);
    } catch (error) {
      logger.error('Failed to send Slack notification', { error: error.message });
    }
  }

  private async logToDatabase(payload: NotificationPayload): Promise<void> {
    // Optional: Log to MongoDB collection
    try {
      // This would be implemented if you have a notifications collection
      // await NotificationLog.create({
      //   type: payload.type,
      //   backupId: payload.backupId,
      //   details: payload.details,
      //   timestamp: new Date(),
      // });
    } catch (error) {
      logger.warn('Could not log notification to database', { error: error.message });
    }
  }

  private formatEmail(payload: NotificationPayload): { subject: string; html: string } {
    const timestamp = new Date().toISOString();

    switch (payload.type) {
      case 'backup_success':
        return {
          subject: `✅ Backup Success - ${payload.backupId}`,
          html: `
            <h2>✅ Backup Completed Successfully</h2>
            <p><strong>Backup ID:</strong> ${payload.backupId}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr style="background-color: #f0f0f0;">
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>MongoDB Size Before</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${payload.result?.mongodbSizeBefore}MB</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>MongoDB Size After</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${payload.result?.mongodbSizeAfter}MB</td>
              </tr>
              <tr style="background-color: #f0f0f0;">
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>Saved</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${
                  payload.result?.mongodbSizeBefore - payload.result?.mongodbSizeAfter
                }MB</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>Backup Size</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${payload.result?.compressedSize}MB</td>
              </tr>
              <tr style="background-color: #f0f0f0;">
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>Duration</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${Math.round(
                  payload.result?.duration / 1000
                )}s</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 10px;"><strong>Location</strong></td>
                <td style="border: 1px solid #ddd; padding: 10px;">${payload.result?.bunnyPath}</td>
              </tr>
            </table>
          `,
        };

      case 'backup_error':
        return {
          subject: `❌ Backup Failed - ${payload.backupId}`,
          html: `
            <h2 style="color: red;">❌ Backup Failed</h2>
            <p><strong>Backup ID:</strong> ${payload.backupId}</p>
            <p><strong>Error:</strong> ${payload.error}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p style="color: red; font-weight: bold;">Please check logs and retry manually if needed.</p>
          `,
        };

      default:
        return {
          subject: `Backup Notification - ${payload.type}`,
          html: `<pre>${JSON.stringify(payload, null, 2)}</pre>`,
        };
    }
  }

  private formatSlack(payload: NotificationPayload): any {
    const colors = {
      backup_success: '#36a64f',
      backup_error: '#ff0000',
      backup_warning: '#ffaa00',
      restore_success: '#36a64f',
      restore_error: '#ff0000',
    };

    const titles = {
      backup_success: '✅ Backup Successful',
      backup_error: '❌ Backup Failed',
      backup_warning: '⚠️ Backup Warning',
      restore_success: '✅ Restore Successful',
      restore_error: '❌ Restore Failed',
    };

    return {
      attachments: [
        {
          color: colors[payload.type],
          title: titles[payload.type],
          fields: [
            {
              title: 'Backup ID',
              value: payload.backupId || 'N/A',
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            },
            ...(payload.result
              ? [
                  {
                    title: 'MongoDB Size',
                    value: `${payload.result.mongodbSizeBefore}MB → ${payload.result.mongodbSizeAfter}MB (Saved: ${
                      payload.result.mongodbSizeBefore - payload.result.mongodbSizeAfter
                    }MB)`,
                    short: false,
                  },
                  {
                    title: 'Duration',
                    value: `${Math.round(payload.result.duration / 1000)}s`,
                    short: true,
                  },
                  {
                    title: 'Location',
                    value: payload.result.bunnyPath,
                    short: false,
                  },
                ]
              : []),
            ...(payload.error
              ? [
                  {
                    title: 'Error',
                    value: payload.error,
                    short: false,
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }
}

export const sendNotification = async (payload: NotificationPayload) => {
  const service = new NotificationService();
  await service.send(payload);
};

export default NotificationService;
