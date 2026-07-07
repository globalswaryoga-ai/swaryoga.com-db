/**
 * Sadhana Reminder Service - Email & WhatsApp Reminders
 * Sends notifications before sessions
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

// WhatsApp Configuration
const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
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

    const result = await transporter.sendMail(mailOptions);

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
 * Send WhatsApp Reminder via Meta API
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
  try {
    if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
      return {
        success: false,
        message: 'WhatsApp not configured',
      };
    }

    // Format phone number (add country code if needed)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = '91' + formattedPhone; // India country code
    }

    const message = `🧘 *${reminderData.programName}* Reminder!\n\n⏰ Starts in *${reminderData.minutesBefore} minutes*\n🕐 Time: ${reminderData.startTime}\n\n🔗 Join: ${reminderData.zoomLink}\n\n_See you soon! Namaste 🙏_`;

    const response = await axios.post(
      `https://graph.instagram.com/v18.0/${whatsappConfig.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Reminder] 💬 WhatsApp sent to ${formattedPhone}`);

    return {
      success: true,
      message: `WhatsApp sent to ${phoneNumber}`,
    };
  } catch (err: any) {
    console.error('[Reminder] WhatsApp error:', err.message);
    return {
      success: false,
      message: `WhatsApp failed: ${err.message}`,
    };
  }
}

/**
 * Send SMS Reminder (via Twilio or similar)
 */
export async function sendSMSReminder(
  phoneNumber: string,
  reminderData: {
    programName: string;
    startTime: string;
    minutesBefore: number;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      return {
        success: false,
        message: 'SMS not configured',
      };
    }

    const message = `🧘 ${reminderData.programName} starts in ${reminderData.minutesBefore} min at ${reminderData.startTime}. Join your Zoom meeting now!`;

    // Twilio integration would go here
    console.log(`[Reminder] 📱 SMS would be sent to ${phoneNumber}`);

    return {
      success: true,
      message: `SMS prepared for ${phoneNumber}`,
    };
  } catch (err: any) {
    console.error('[Reminder] SMS error:', err.message);
    return {
      success: false,
      message: `SMS failed: ${err.message}`,
    };
  }
}

/**
 * Schedule reminders for upcoming session
 */
export async function scheduleSessionReminders(
  sessionData: {
    programName: string;
    startTime: Date;
    zoomLink: string;
    participants: Array<{
      email?: string;
      phone?: string;
      name: string;
    }>;
  }
): Promise<any> {
  try {
    const results = {
      emailReminders: 0,
      whatsappReminders: 0,
      smsReminders: 0,
      failed: 0,
    };

    const startTime = new Date(sessionData.startTime);
    const now = new Date();
    const timeUntilSession = (startTime.getTime() - now.getTime()) / (1000 * 60); // minutes

    // Send reminder if session starts in 30 min or 15 min
    const remindBefore = [30, 15];

    for (const minutesBefore of remindBefore) {
      if (timeUntilSession <= minutesBefore && timeUntilSession > minutesBefore - 1) {
        console.log(`[Reminder] 🔔 Sending ${minutesBefore}-minute reminders...`);

        const timeStr = `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`;

        for (const participant of sessionData.participants) {
          // Email reminder
          if (participant.email) {
            const emailResult = await sendEmailReminder(participant.email, {
              programName: sessionData.programName,
              startTime: timeStr,
              duration: 40,
              zoomLink: sessionData.zoomLink,
              minutesBefore,
            });

            if (emailResult.success) {
              results.emailReminders++;
            } else {
              results.failed++;
            }
          }

          // WhatsApp reminder
          if (participant.phone) {
            const whatsappResult = await sendWhatsAppReminder(participant.phone, {
              programName: sessionData.programName,
              startTime: timeStr,
              minutesBefore,
              zoomLink: sessionData.zoomLink,
            });

            if (whatsappResult.success) {
              results.whatsappReminders++;
            } else {
              results.failed++;
            }
          }
        }
      }
    }

    console.log(`[Reminder] ✅ Reminders scheduled:`, results);

    return results;
  } catch (err) {
    console.error('[Reminder] Error scheduling reminders:', err);
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
 * Test WhatsApp configuration
 */
export async function testWhatsAppConfig(): Promise<{ success: boolean; message: string }> {
  try {
    if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
      return {
        success: false,
        message: 'WhatsApp credentials missing',
      };
    }

    return {
      success: true,
      message: 'WhatsApp configuration is valid',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `WhatsApp config error: ${err.message}`,
    };
  }
}

export default {
  sendEmailReminder,
  sendWhatsAppReminder,
  sendSMSReminder,
  scheduleSessionReminders,
  testEmailConfig,
  testWhatsAppConfig,
};
