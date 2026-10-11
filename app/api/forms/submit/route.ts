/**
 * @fileoverview Universal Form Submission API
 * Handles signup, lead, workshop, sales forms with auto-password generation
 * Sends credentials via WhatsApp and Email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByPhone, upsertUser } from '@/lib/repositories/userRepository';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initBunnyCommunitySchema } from '@/lib/bunnyCommunityRepository';
import { reserveBunnyFormSeat } from '@/lib/registrationFormSeats';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { notifyFormSubmission } from '@/lib/notifications';
import { randomInt } from 'crypto';
import { saveBunnyLead } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';
import { pushLeadToGoogleContacts } from '@/lib/googleContactsManager';
// Rate limiting: 10 submissions per 15 minutes per IP
const FORM_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
};

/**
 * Generate a short password for a newly created account.
 * Format: three letters followed by three numbers, with the first letter
 * uppercase (for example: Nat993).
 */
function generatePassword(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randomLetter = () => letters[randomInt(letters.length)];
  const firstLetter = randomLetter().toUpperCase();
  const remainingLetters = `${randomLetter()}${randomLetter()}`;
  const numbers = String(randomInt(1000)).padStart(3, '0');

  return `${firstLetter}${remainingLetters}${numbers}`;
}

/**
 * Send WhatsApp notification with credentials using UTILITY template
 * Template: user_credentials_notification
 * Params: {{1}}=Profile ID, {{2}}=Email, {{3}}=Password
 */
async function sendWhatsAppCredentials(
  phone: string,
  countryCode: string,
  name: string,
  email: string,
  password: string,
  userId: string,
  formType: string
) {
  try {
    const fullPhone = `${countryCode.replace('+', '')}${phone.replace(/\D/g, '')}`;
    
    // Use WhatsApp Cloud API
    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.log('[WhatsApp] Missing credentials, skipping notification');
      return;
    }
    
    // Use UTILITY template for credentials notification
    const templateName = 'user_credentials_notification';
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: userId },      // {{profile_id}}
                  { type: 'text', text: email },       // {{email}}  
                  { type: 'text', text: password },    // {{password}}
                ],
              },
            ],
          },
        }),
      }
    );
    
    if (response.ok) {
      console.log(`✅ WhatsApp credentials template sent to ${fullPhone}`);
    } else {
      const errData = await response.json();
      console.error('❌ WhatsApp template send failed:', errData);
      
      // Fallback to plain text if template fails (not approved yet)
      if (errData?.error?.code === 132000 || errData?.error?.message?.includes('template')) {
        console.log('[WhatsApp] Template not ready, sending plain text fallback...');
        await sendWhatsAppCredentialsFallback(fullPhone, name, email, password, userId);
      }
    }
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error);
  }
}

/**
 * Fallback: Send plain text (if template not approved yet)
 */
async function sendWhatsAppCredentialsFallback(
  fullPhone: string,
  name: string,
  email: string,
  password: string,
  userId: string
) {
  try {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    const message = `Welcome to Swar Yoga!

Your account has been created successfully.

Your Login Credentials:
Profile ID: ${userId}
Email: ${email}
Password: ${password}

Login here: https://swaryoga.com/signin

Please save these credentials safely.

Har Har Mahadev`;

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    
    if (response.ok) {
      console.log(`✅ WhatsApp fallback text sent to ${fullPhone}`);
    }
  } catch (error) {
    console.error('❌ WhatsApp fallback error:', error);
  }
}

/**
 * Send Email notification with credentials
 */
async function sendEmailCredentials(
  email: string,
  name: string,
  password: string,
  userId: string,
  formType: string
) {
  try {
    // Use Resend or existing email service
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.log('[Email] Missing API key, skipping notification');
      return;
    }
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; border: 2px solid #10b981; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .credential-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: bold; color: #10b981; font-family: monospace; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧘 Welcome to Swar Yoga!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with Swar Yoga! Your account has been created successfully.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0; color: #10b981;">🔐 Your Login Credentials</h3>
        <div class="credential-row">
          <span class="label">User ID:</span>
          <span class="value">${userId}</span>
        </div>
        <div class="credential-row">
          <span class="label">Email:</span>
          <span class="value">${email}</span>
        </div>
        <div class="credential-row">
          <span class="label">Password:</span>
          <span class="value">${password}</span>
        </div>
      </div>
      
      <p>⚠️ Please save these credentials in a safe place!</p>
      
      <center>
        <a href="https://swaryoga.com/signin" class="btn">Login Now →</a>
      </center>
      
      <p style="margin-top: 30px;">If you have any questions, feel free to reach out to us.</p>
      <p>Namaste! 🙏</p>
    </div>
    <div class="footer">
      <p>🧘 Swar Yoga - Transform Your Life</p>
      <p>www.swaryoga.com</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Swar Yoga <noreply@swaryoga.com>',
        to: email,
        subject: `🧘 Welcome to Swar Yoga - Your Login Credentials`,
        html: htmlContent,
      }),
    });
    
    if (response.ok) {
      console.log(`✅ Email credentials sent to ${email}`);
    } else {
      const errData = await response.json();
      console.error('❌ Email send failed:', errData);
    }
  } catch (error) {
    console.error('❌ Email notification error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientId(request.headers);
    const rateLimitCheck = checkRateLimit(clientId, FORM_RATE_LIMIT);
    
    if (!rateLimitCheck.allowed) {
      const retryAfter = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many submissions. Please try again later.');
    }

    const body = await request.json();
    const {
      formType,
      source,
      ref,
      name,
      email,
      phone,
      countryCode = '+91',
      country,
      state,
      gender,
      age,
      profession,
      interest,
      workshopName,
      workshopLanguage,
      workshopMode,
      educationStatus,
      batchPreference,
      participantStatus,
      city,
      timeAvailable,
      videoOnDuringClass,
      regularAttendance,
      healthIssues,
      deviceForWorkshop,
      donationReady,
      awarenessConfirmed,
      finalConfirmation,
      courseName,
      paymentMode,
      message,
      workshopScheduleId,
    } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return apiError('VALIDATION_ERROR', 'Name, email, and phone are required');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email format');
    }


    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = normalizePhone(phone);
    const cleanedName = name.trim();


    const allLeads = await loadBunnyLeads();
    const existingLead = allLeads.find(lead =>
      (!lead.createdByUserId || lead.createdByUserId === 'system') &&
      (String(lead.email || '').toLowerCase() === cleanedEmail || normalizePhone(lead.phoneNumber) === cleanedPhone));
    if (formType === 'workshop' && workshopScheduleId) {
      const reserved = await reserveBunnyFormSeat(String(workshopScheduleId), cleanedEmail, cleanedPhone);
      if (!reserved) return apiError('SLOT_UNAVAILABLE', 'This workshop batch is full or its seat inventory is unavailable. Please choose another batch.');
    }
    const generatedPassword = generatePassword();
    const existingUser = await getUserByEmail(cleanedEmail) || await getUserByPhone(cleanedPhone);
    let user = existingUser ? { ...existingUser, _id: existingUser.id } : null;
    let leadNumber: string | null = existingLead?.leadNumber || null;
    let isNewUser = false;
    if (formType === 'signup' || formType === 'workshop') {
      const saved = await upsertUser({
        ...(existingUser || {}),
        name: cleanedName, email: cleanedEmail, phone: cleanedPhone,
        ...(existingUser ? {} : { password: await bcrypt.hash(generatedPassword, 10) }),
      });
      user = { ...saved, _id: saved.id };
      isNewUser = !existingUser;
    }

    // Create/Update CRM Lead
    try {
      const meta = {
        formType: formType || 'form-link',
        source: source || 'form-link',
        ref: ref || null,
        userId: user?._id?.toString(),
        country: country?.trim() || '',
        state: state?.trim() || '',
        gender: gender?.trim() || '',
        age: age ? parseInt(age, 10) : null,
        profession: profession?.trim() || '',
        interest: interest || '',
        workshopName: workshopName || '',
        workshopLanguage: workshopLanguage || '',
        workshopMode: workshopMode || '',
        educationStatus: educationStatus || '',
        batchPreference: batchPreference || '',
        workshopScheduleId: workshopScheduleId || '',
        participantStatus: participantStatus || '',
        city: city || '',
        timeAvailable: timeAvailable || '',
        videoOnDuringClass: videoOnDuringClass || '',
        regularAttendance: regularAttendance || '',
        healthIssues: healthIssues || '',
        deviceForWorkshop: deviceForWorkshop || '',
        donationReady: donationReady || '',
        awarenessConfirmed: Boolean(awarenessConfirmed),
        finalConfirmation: Boolean(finalConfirmation),
        courseName: courseName || '',
        paymentMode: paymentMode || '',
        message: message || '',
        submittedAt: new Date(),
      };


      if (!leadNumber) leadNumber = (await allocateNextLeadNumber('system')).leadNumber;
      const savedLead = await saveBunnyLead({
        ...(existingLead || {}),
        leadNumber, name: cleanedName, email: cleanedEmail, phoneNumber: cleanedPhone,
        status: existingLead?.status || (formType === 'workshop' || formType === 'sales' ? 'hot' : 'lead'),
        source: existingLead?.source || source || 'website-form',
        workshopName: workshopName || existingLead?.workshopName || 'Form Submission',
        labels: [...new Set([...(existingLead?.labels || []), 'form-submission', formType || 'lead', workshopName || 'general'])],
        createdByUserId: existingLead?.createdByUserId || 'system',
        assignedToUserId: existingLead?.assignedToUserId || 'system',
        metadata: { ...existingLead?.metadata, ...meta },
        ...(user?._id ? { linkedUserId: user._id, isLinkedToAccount: true } : {}),
      }, existingLead?._id);
      leadNumber = savedLead.leadNumber;
    } catch (leadError) {
      logError('forms/createLead', leadError);
      return apiError('Your account may already exist, but the CRM form record could not be saved. Please retry with the same email.', 503);
    }

    // Auto-join Global Community
    try {

      await initBunnyCommunitySchema();
      const timestamp = new Date().toISOString();
      const memberId = 'global_' + (user?._id || cleanedPhone);
      await bunnyExecute({
        sql: "INSERT INTO community_members_sql (document_id, community_id, user_id, status, approved, joined_at, data_json, created_at, updated_at) VALUES (?, 'global', ?, 'active', 1, ?, ?, ?, ?) ON CONFLICT(document_id) DO NOTHING",
        args: [memberId, user?._id || leadNumber, timestamp,
          JSON.stringify({ _id: memberId, name: cleanedName, email: cleanedEmail, mobile: cleanedPhone,
            communityId: 'global', communityName: 'Global Community', userId: user?._id || leadNumber,
            status: 'active', approved: true, joinedAt: timestamp, chatEnabled: true }),
          timestamp, timestamp],
      });
    } catch (communityError) {
      console.error('Community join error:', communityError);
      // Non-fatal
    }

    // Send credentials only for a newly created account. Existing users keep
    // their current password and can simply submit updated form details.
    if (isNewUser) {
      // Notifications are intentionally fire-and-forget so form submission
      // does not wait for external messaging providers.
      Promise.all([
        sendWhatsAppCredentials(
          phone,
          countryCode,
          cleanedName,
          cleanedEmail,
          generatedPassword,
          leadNumber || user?._id?.toString() || '',
          formType
        ),
        sendEmailCredentials(
          cleanedEmail,
          cleanedName,
          generatedPassword,
          leadNumber || user?._id?.toString() || '',
          formType
        ),
      ]).catch(err => console.error('Notification error:', err));
    }

    // Fire-and-forget: Send form submission confirmation email (for all form types)
    notifyFormSubmission(
      { name: cleanedName, email: cleanedEmail, phone: cleanedPhone },
      { formType: formType || 'enquiry', workshopName: workshopName || '', leadNumber: leadNumber || '' },
    ).catch(err => console.error('[FormSubmit] Notification error:', err));

    // Generate token if user exists
    let token;
    if (user?._id) {
      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
      });
    }

    return apiSuccess({
      message: 'Form submitted successfully',
      leadNumber,
      credentials: isNewUser ? {
        userId: leadNumber || user?._id?.toString() || '',
        email: cleanedEmail,
      } : undefined,
      token,
    }, 201);

  } catch (error) {
    logError('forms/submit', error);
    return apiError('SERVER_ERROR', 'Failed to process form');
  }
}
