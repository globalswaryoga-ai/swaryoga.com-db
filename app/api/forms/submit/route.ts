/**
 * @fileoverview Universal Form Submission API
 * Handles signup, lead, workshop, sales forms with auto-password generation
 * Sends credentials via WhatsApp and Email
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, CommunityMember, WorkshopSeatInventory } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import bcrypt from 'bcryptjs';
import { notifyFormSubmission } from '@/lib/notifications';
import { buildContactDuplicateQuery } from '@/lib/contactDuplicateCheck';
import { randomInt } from 'crypto';

export const dynamic = 'force-dynamic';


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

    await connectDB();

    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = normalizePhone(phone);
    const cleanedName = name.trim();

    // Reserve one admin-approved seat atomically. Re-submitting the same
    // contact for the same batch does not consume another seat.
    if (formType === 'workshop' && workshopScheduleId) {
      const Lead = getLead();
      const priorLead = await Lead.findOne({
        $or: buildContactDuplicateQuery(cleanedEmail, cleanedPhone),
      }).select({ metadata: 1 }).lean() as any;
      const priorScheduleId = String(priorLead?.metadata?.workshopScheduleId || '');

      if (priorScheduleId !== String(workshopScheduleId)) {
        const inventory = await WorkshopSeatInventory.findOneAndUpdate(
          {
            scheduleId: String(workshopScheduleId),
            seatsRemaining: { $gt: 0 },
          },
          { $inc: { seatsRemaining: -1 }, $set: { updatedAt: new Date() } },
          { new: true },
        ).lean();

        if (!inventory) {
          return apiError('SLOT_UNAVAILABLE', 'This workshop batch is full. Please choose another batch.');
        }

        if (priorScheduleId) {
          await WorkshopSeatInventory.updateOne(
            { scheduleId: priorScheduleId },
            { $inc: { seatsRemaining: 1 }, $set: { updatedAt: new Date() } },
          );
        }
      }
    }

    // Passwords are generated server-side and emailed to newly created users.
    const generatedPassword = generatePassword();
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${cleanedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { phone: cleanedPhone },
      ],
    }).lean();

    let user: any = existingUser;
    let leadNumber: string | null = null;
    let isNewUser = false;

    // Create user account for signup/workshop forms, or if user doesn't exist
    if (!existingUser && (formType === 'signup' || formType === 'workshop')) {
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
      
      const newUser = new User({
        name: cleanedName,
        email: cleanedEmail,
        phone: cleanedPhone,
        countryCode: countryCode || '+91',
        country: country?.trim() || 'India',
        state: state?.trim() || '',
        gender: gender?.trim() || '',
        age: age ? parseInt(age, 10) : null,
        profession: profession?.trim() || '',
        password: hashedPassword,
      });

      await newUser.save();
      user = newUser;
      isNewUser = true;
      console.log(`✅ New user created: ${cleanedEmail}`);
    }

    // Existing signed-in/form users can edit their profile details and save again.
    // Do not change their password during a repeat submission.
    if (existingUser && (formType === 'signup' || formType === 'workshop')) {
      await User.updateOne(
        { _id: (existingUser as any)._id },
        {
          $set: {
            name: cleanedName,
            email: cleanedEmail,
            phone: cleanedPhone,
            countryCode: countryCode || '+91',
            country: country?.trim() || 'India',
            state: state?.trim() || '',
            gender: gender?.trim() || '',
            age: age ? parseInt(age, 10) : null,
            profession: profession?.trim() || '',
          },
        },
      );
    }

    // Create/Update CRM Lead
    try {
      const Lead = getLead();
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

      // Check for existing lead using normalized email/phone matching
      const existingLead = await Lead.findOne({
        $or: buildContactDuplicateQuery(cleanedEmail, cleanedPhone),
      }).lean();

      if (existingLead) {
        // Update existing lead
        await Lead.updateOne(
          { _id: (existingLead as any)._id },
          {
            $set: {
              name: cleanedName,
              email: cleanedEmail,
              metadata: meta,
              ...(user?._id ? { linkedUserId: user._id, isLinkedToAccount: true } : {}),
            },
            $addToSet: {
              labels: { $each: ['form-submission', formType || 'lead', workshopName || 'general'].filter(Boolean) },
            },
          }
        );
        leadNumber = String((existingLead as any).leadNumber || '');
        console.log(`✅ Lead updated: ${leadNumber}`);
      } else {
        // Create new lead
        const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber();
        const newLead = await Lead.create({
          leadNumber: allocatedLeadNumber,
          name: cleanedName,
          email: cleanedEmail,
          phoneNumber: cleanedPhone,
          status: formType === 'workshop' || formType === 'sales' ? 'hot' : 'lead',
          source: source || 'website-form',
          workshopName: workshopName || (formType === 'signup' ? 'Website Signup' : 'Form Submission'),
          labels: ['form-submission', formType || 'lead', workshopName || 'general'].filter(Boolean),
          createdByUserId: 'system',
          assignedToUserId: 'system',
          metadata: meta,
          ...(user?._id ? { linkedUserId: user._id, isLinkedToAccount: true } : {}),
        });
        
        // Add to broadcast list
        await addLeadToMainBroadcastList(newLead);
        
        leadNumber = String(allocatedLeadNumber);
        console.log(`✅ New lead created: ${leadNumber}`);
      }
    } catch (leadError) {
      logError('forms/createLead', leadError);
      // Non-fatal - continue
    }

    // Auto-join Global Community
    try {
      const existingMember = await CommunityMember.findOne({
        mobile: cleanedPhone,
        communityId: 'global',
      });
      
      if (!existingMember) {
        await CommunityMember.create({
          name: cleanedName,
          email: cleanedEmail,
          mobile: cleanedPhone,
          countryCode: countryCode || '+91',
          userId: leadNumber || user?._id?.toString() || '',
          communityId: 'global',
          communityName: 'Global Community',
          status: 'active',
          approved: true,
          joinedAt: new Date(),
          chatEnabled: true,
        });
        console.log(`✅ Auto-joined ${cleanedName} to Global Community`);
      }
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
