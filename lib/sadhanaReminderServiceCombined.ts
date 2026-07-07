/**
 * Sadhana Reminder Service - Combined (QR WhatsApp + Meta)
 * Automatically selects QR or Meta based on schedule setting
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

// Email Configuration
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
};

// Meta WhatsApp Configuration
const metaWhatsAppConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
};

let emailTransporter: any = null;

function getEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport(emailConfig);
  }
  return emailTransporter;
}

/**
 * Send WhatsApp via QR Bridge
 */
async function sendViaQRBridge(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!qrWhatsAppConfig.bridgeUrl) {
      console.warn('[Reminder] ⚠️ QR Bridge not configured');
      return false;
    }

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone;
    }

    const response = await axios.post(
      `${qrWhatsAppConfig.bridgeUrl}/api/send`,
      {
        phone: formattedPhone,
        message: message,
        metadata: { type: 'sadhana_reminder', timestamp: new Date().toISOString() },
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
      console.log(`[Reminder] ✅ QR WhatsApp sent to ${formattedPhone}`);
      return true;
    }

    console.warn(`[Reminder] ⚠️ QR WhatsApp failed (${response.status})`);
    return false;
  } catch (err: any) {
    console.error('[Reminder] QR WhatsApp error:', err.message);
    return false;
  }
}

/**
 * Send WhatsApp via Meta Business API
 */
async function sendViaMeta(phoneNumber: string, message: string): Promise<boolean> {
  try {
    if (!metaWhatsAppConfig.phoneNumberId || !metaWhatsAppConfig.accessToken) {
      console.warn('[Reminder] ⚠️ Meta not configured');
      return false;
    }

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone;
    }

    const response = await axios.post(
      `https://graph.instagram.com/v18.0/${metaWhatsAppConfig.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: true, body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${metaWhatsAppConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log(`[Reminder] ✅ Meta WhatsApp sent to ${formattedPhone}`);
      return true;
    }

    console.warn(`[Reminder] ⚠️ Meta WhatsApp failed (${response.status})`);
    return false;
  } catch (err: any) {
    console.error('[Reminder] Meta WhatsApp error:', err.message);
    return false;
  }
}

/**
 * Send WhatsApp using selected provider(s)
 * provider: 'qr' = QR only, 'meta' = Meta only, 'both' = try QR first, then Meta as backup
 */
async function sendWhatsApp(
  phoneNumber: string,
  message: string,
  provider: 'qr' | 'meta' | 'both' = 'qr'
): Promise<boolean> {
  console.log(`[Reminder] 💬 Sending WhatsApp via ${provider} to ${phoneNumber}...`);

  switch (provider) {
    case 'qr':
      return await sendViaQRBridge(phoneNumber, message);

    case 'meta':
      return await sendViaMeta(phoneNumber, message);

    case 'both':
      // Try QR first
      const qrSuccess = await sendViaQRBridge(phoneNumber, message);
      if (qrSuccess) return true;

      // If QR fails, try Meta as backup
      console.log('[Reminder] QR failed, trying Meta as backup...');
      return await sendViaMeta(phoneNumber, message);

    default:
      return false;
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
      return { success: false, message: 'Email not configured' };
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

    await transporter.sendMail({
      from: `"Swar Yoga" <${emailConfig.auth.user}>`,
      to: emailAddress,
      subject: `⏰ Reminder: ${reminderData.programName} starts in ${reminderData.minutesBefore} minutes!`,
      html: htmlContent,
    });

    console.log(`[Reminder] 📧 Email sent to ${emailAddress}`);
    return { success: true, message: `Email sent to ${emailAddress}` };
  } catch (err: any) {
    console.error('[Reminder] Email error:', err.message);
    return { success: false, message: `Email failed: ${err.message}` };
  }
}

/**
 * Send WhatsApp Reminder with provider choice
 */
export async function sendWhatsAppReminder(
  phoneNumber: string,
  reminderData: {
    programName: string;
    startTime: string;
    minutesBefore: number;
    zoomLink: string;
  },
  provider: 'qr' | 'meta' | 'both' = 'qr'
): Promise<{ success: boolean; message: string }> {
  const message = `
🧘 *${reminderData.programName}* Reminder!

⏰ Starts in *${reminderData.minutesBefore} minutes*
🕐 Time: ${reminderData.startTime}

🔗 Join: ${reminderData.zoomLink}

_See you soon! Namaste 🙏_
`.trim();

  const success = await sendWhatsApp(phoneNumber, message, provider);
  return {
    success,
    message: success ? `WhatsApp sent to ${phoneNumber}` : `WhatsApp failed for ${phoneNumber}`,
  };
}

/**
 * Send batch reminders with provider selection
 */
export async function sendBatchReminders(
  sessionData: {
    programName: string;
    startTime: Date;
    zoomLink: string;
    videoDuration?: number;
    participantEmails?: string[];
    participantPhones?: string[];
    whatsappProvider?: 'qr' | 'meta' | 'both'; // New: choose provider
  }
): Promise<any> {
  try {
    const results = {
      emailsSent: 0,
      emailsFailed: 0,
      whatsappSent: 0,
      whatsappFailed: 0,
      total: 0,
      provider: sessionData.whatsappProvider || 'qr',
    };

    const startTime = new Date(sessionData.startTime);
    const timeStr = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const duration = sessionData.videoDuration || 40;
    const provider = sessionData.whatsappProvider || 'qr';

    console.log(
      `[Reminder] 📢 Sending batch reminders for: ${sessionData.programName} (WhatsApp: ${provider})`
    );

    // Send emails
    if (sessionData.participantEmails && sessionData.participantEmails.length > 0) {
      const emailCount = Math.min(sessionData.participantEmails.length, 299);
      console.log(`[Reminder] 📧 Sending to ${emailCount} emails (30 min before)...`);

      for (let i = 0; i < emailCount; i++) {
        const email = sessionData.participantEmails[i];
        if (!email) continue;

        try {
          const result = await sendEmailReminder(email, {
            programName: sessionData.programName,
            startTime: timeStr,
            duration: duration,
            zoomLink: sessionData.zoomLink,
            minutesBefore: 30,
          });

          if (result.success) results.emailsSent++;
          else results.emailsFailed++;
          results.total++;
        } catch (err) {
          console.warn(`[Reminder] Email failed for ${email}:`, err);
          results.emailsFailed++;
          results.total++;
        }
      }

      console.log(`[Reminder] ✅ Emails: ${results.emailsSent}/${emailCount} sent`);
    }

    // Send WhatsApp using selected provider
    if (sessionData.participantPhones && sessionData.participantPhones.length > 0) {
      const phoneCount = Math.min(sessionData.participantPhones.length, 299);
      console.log(`[Reminder] 💬 Sending to ${phoneCount} WhatsApp (${provider} - 15 min before)...`);

      for (let i = 0; i < phoneCount; i++) {
        const phone = sessionData.participantPhones[i];
        if (!phone) continue;

        try {
          const result = await sendWhatsAppReminder(
            phone,
            {
              programName: sessionData.programName,
              startTime: timeStr,
              minutesBefore: 15,
              zoomLink: sessionData.zoomLink,
            },
            provider as 'qr' | 'meta' | 'both'
          );

          if (result.success) results.whatsappSent++;
          else results.whatsappFailed++;
          results.total++;
        } catch (err) {
          console.warn(`[Reminder] WhatsApp failed for ${phone}:`, err);
          results.whatsappFailed++;
          results.total++;
        }
      }

      console.log(`[Reminder] ✅ WhatsApp: ${results.whatsappSent}/${phoneCount} sent (${provider})`);
    }

    console.log(`[Reminder] 📊 Summary:`, results);
    return results;
  } catch (err) {
    console.error('[Reminder] Error in batch reminders:', err);
    throw err;
  }
}

/**
 * Test configurations
 */
export async function testConfigurations(): Promise<any> {
  const tests = {
    email: { status: false, message: '' },
    qrWhatsApp: { status: false, message: '' },
    metaWhatsApp: { status: false, message: '' },
  };

  // Test Email
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    tests.email = { status: true, message: 'Email SMTP configured ✅' };
  } catch (err: any) {
    tests.email = { status: false, message: `Email error: ${err.message}` };
  }

  // Test QR WhatsApp
  try {
    if (!qrWhatsAppConfig.bridgeUrl) {
      tests.qrWhatsApp = { status: false, message: 'QR Bridge URL not configured' };
    } else {
      const response = await axios.get(`${qrWhatsAppConfig.bridgeUrl}/api/health`, { timeout: 5000 });
      if (response.status === 200) {
        tests.qrWhatsApp = { status: true, message: 'QR WhatsApp Bridge connected ✅' };
      }
    }
  } catch (err: any) {
    tests.qrWhatsApp = { status: false, message: `QR error: ${err.message}` };
  }

  // Test Meta WhatsApp
  try {
    if (!metaWhatsAppConfig.phoneNumberId || !metaWhatsAppConfig.accessToken) {
      tests.metaWhatsApp = { status: false, message: 'Meta credentials not configured' };
    } else {
      tests.metaWhatsApp = { status: true, message: 'Meta WhatsApp configured ✅' };
    }
  } catch (err: any) {
    tests.metaWhatsApp = { status: false, message: `Meta error: ${err.message}` };
  }

  return tests;
}

export default {
  sendEmailReminder,
  sendWhatsAppReminder,
  sendBatchReminders,
  testConfigurations,
};
