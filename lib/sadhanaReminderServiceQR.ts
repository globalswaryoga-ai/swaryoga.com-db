/**
 * Sadhana Reminder Service - Using QR WhatsApp Bridge
 * Sends email via SMTP + WhatsApp via QR WhatsApp Bridge (not Meta API)
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

// Email Configuration (SMTP)
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// QR WhatsApp Bridge Configuration
const qrWhatsAppConfig = {
  bridgeUrl: process.env.WHATSAPP_BRIDGE_HTTP_URL || 'https://wa-bridge.swaryoga.com',
  bridgeSecret: process.env.WHATSAPP_BRIDGE_SECRET || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
};

let emailTransporter: any = null;

/**
 * Initialize email transporter
 */
function getEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport(emailConfig);
  }
  return emailTransporter;
}

/**
 * Send WhatsApp message via QR WhatsApp Bridge
 * Uses existing QR WhatsApp service instead of Meta API
 */
export async function sendWhatsAppViaQRBridge(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!qrWhatsAppConfig.bridgeUrl) {
      console.warn('[Reminder] ⚠️ QR WhatsApp Bridge URL not configured');
      return {
        success: false,
        message: 'QR WhatsApp Bridge not configured',
      };
    }

    // Normalize phone number to include country code
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone;
    }

    console.log(`[Reminder] 💬 Sending WhatsApp via QR Bridge to ${formattedPhone}...`);

    // Send via QR WhatsApp Bridge
    const response = await axios.post(
      `${qrWhatsAppConfig.bridgeUrl}/api/send`,
      {
        phone: formattedPhone,
        message: message,
        // Optional: include metadata
        metadata: {
          type: 'sadhana_reminder',
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${qrWhatsAppConfig.bridgeSecret}`,
        },
        timeout: 10000,
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log(`[Reminder] ✅ WhatsApp sent via QR Bridge to ${formattedPhone}`);
      return {
        success: true,
        message: `WhatsApp sent to ${phoneNumber}`,
      };
    }

    console.warn(`[Reminder] ⚠️ WhatsApp failed (${response.status}):`, response.data);
    return {
      success: false,
      message: `Failed: ${response.data?.message || response.statusText}`,
    };
  } catch (err: any) {
    console.error('[Reminder] WhatsApp error:', err.message);
    return {
      success: false,
      message: `Error: ${err.message}`,
    };
  }
}

/**
 * Send Email Reminder
 */
export async function sendEmailReminder(
  emailAddress: string,
  reminderData: {
    programName: string;
    startTime: string;
    duration: number;
    zoomLink: string;
    minutesBefore: number;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!emailAddress || !emailConfig.auth.user) {
      return {
        success: false,
        message: 'Email not configured',
      };
    }

    const transporter = getEmailTransporter();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🧘 Sadhana Session Reminder</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Dear Participant,</p>

          <p style="font-size: 14px; color: #666;">
            This is a reminder that our <strong>${reminderData.programName}</strong> session starts in <strong>${reminderData.minutesBefore} minutes</strong>!
          </p>

          <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 10px 0;"><strong>📅 Session Details:</strong></p>
            <p style="margin: 5px 0;">🕐 Start Time: <strong>${reminderData.startTime}</strong></p>
            <p style="margin: 5px 0;">⏱️ Duration: <strong>${reminderData.duration} minutes</strong></p>
          </div>

          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            Be ready to join a few minutes early. Here's your Zoom link:
          </p>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${reminderData.zoomLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Join Zoom Meeting →
            </a>
          </div>

          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            🕉️ Swar Yoga - Daily Sadhana Program<br>
            See you soon! Namaste 🙏
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Swar Yoga" <${emailConfig.auth.user}>`,
      to: emailAddress,
      subject: `⏰ Reminder: ${reminderData.programName} starts in ${reminderData.minutesBefore} minutes!`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    console.log(`[Reminder] 📧 Email sent to ${emailAddress}`);

    return {
      success: true,
      message: `Reminder sent to ${emailAddress}`,
    };
  } catch (err: any) {
    console.error('[Reminder] Email error:', err.message);
    return {
      success: false,
      message: `Email failed: ${err.message}`,
    };
  }
}

/**
 * Send WhatsApp Reminder via QR Bridge
 */
export async function sendWhatsAppReminder(
  phoneNumber: string,
  reminderData: {
    programName: string;
    startTime: string;
    minutesBefore: number;
    zoomLink: string;
  }
): Promise<{ success: boolean; message: string }> {
  const message = `
🧘 *${reminderData.programName}* Reminder!

⏰ Starts in *${reminderData.minutesBefore} minutes*
🕐 Time: ${reminderData.startTime}

🔗 Join: ${reminderData.zoomLink}

_See you soon! Namaste 🙏_
`.trim();

  return sendWhatsAppViaQRBridge(phoneNumber, message);
}

/**
 * Send batch reminders (email and WhatsApp) using QR Bridge
 */
export async function sendBatchReminders(
  sessionData: {
    programName: string;
    startTime: Date;
    zoomLink: string;
    videoDuration?: number;
    participantEmails?: string[];
    participantPhones?: string[];
  }
): Promise<any> {
  try {
    const results = {
      emailsSent: 0,
      emailsFailed: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      total: 0,
    };

    const startTime = new Date(sessionData.startTime);
    const timeStr = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const duration = sessionData.videoDuration || 40;

    console.log(`[Reminder] 📢 Sending batch reminders for: ${sessionData.programName}`);

    // Send emails (max 299)
    if (sessionData.participantEmails && sessionData.participantEmails.length > 0) {
      const emailCount = Math.min(sessionData.participantEmails.length, 299);
      console.log(`[Reminder] 📧 Sending to ${emailCount} email addresses...`);

      for (let i = 0; i < emailCount; i++) {
        const email = sessionData.participantEmails[i];
        if (!email) continue;

        try {
          const emailResult = await sendEmailReminder(email, {
            programName: sessionData.programName,
            startTime: timeStr,
            duration: duration,
            zoomLink: sessionData.zoomLink,
            minutesBefore: 30,
          });

          if (emailResult.success) {
            results.emailsSent++;
          } else {
            results.emailsFailed++;
          }
          results.total++;
        } catch (err) {
          console.warn(`[Reminder] Email failed for ${email}:`, err);
          results.emailsFailed++;
          results.total++;
        }
      }

      console.log(`[Reminder] ✅ Emails: ${results.emailsSent}/${emailCount} sent`);
    }

    // Send WhatsApp via QR Bridge (max 299)
    if (sessionData.participantPhones && sessionData.participantPhones.length > 0) {
      const phoneCount = Math.min(sessionData.participantPhones.length, 299);
      console.log(`[Reminder] 💬 Sending to ${phoneCount} WhatsApp numbers via QR Bridge...`);

      for (let i = 0; i < phoneCount; i++) {
        const phone = sessionData.participantPhones[i];
        if (!phone) continue;

        try {
          const whatsappResult = await sendWhatsAppReminder(phone, {
            programName: sessionData.programName,
            startTime: timeStr,
            minutesBefore: 15,
            zoomLink: sessionData.zoomLink,
          });

          if (whatsappResult.success) {
            results.whatsappSent++;
          } else {
            results.whatsappFailed++;
          }
          results.total++;
        } catch (err) {
          console.warn(`[Reminder] WhatsApp failed for ${phone}:`, err);
          results.whatsappFailed++;
          results.total++;
        }
      }

      console.log(`[Reminder] ✅ WhatsApp: ${results.whatsappSent}/${phoneCount} sent`);
    }

    console.log(`[Reminder] 📊 Summary:`, results);
    return results;
  } catch (err) {
    console.error('[Reminder] Error sending batch reminders:', err);
    throw err;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    return {
      success: true,
      message: 'Email configuration is valid',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Email config error: ${err.message}`,
    };
  }
}

/**
 * Test QR WhatsApp Bridge configuration
 */
export async function testQRWhatsAppConfig(): Promise<{ success: boolean; message: string }> {
  try {
    if (!qrWhatsAppConfig.bridgeUrl) {
      return {
        success: false,
        message: 'QR WhatsApp Bridge URL not configured',
      };
    }

    // Test connection to bridge
    const response = await axios.get(`${qrWhatsAppConfig.bridgeUrl}/api/health`, {
      timeout: 5000,
    });

    if (response.status === 200) {
      return {
        success: true,
        message: 'QR WhatsApp Bridge is connected and ready',
      };
    }

    return {
      success: false,
      message: 'QR WhatsApp Bridge health check failed',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `QR WhatsApp Bridge error: ${err.message}`,
    };
  }
}

export default {
  sendEmailReminder,
  sendWhatsAppReminder,
  sendWhatsAppViaQRBridge,
  sendBatchReminders,
  testEmailConfig,
  testQRWhatsAppConfig,
};
