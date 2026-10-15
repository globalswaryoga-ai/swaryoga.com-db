/**
 * @fileoverview User Signup Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { getUserByEmail, upsertUser } from '@/lib/repositories/userRepository';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { notifySignupConfirmation } from '@/lib/notifications';

export const dynamic = 'force-dynamic';


import { evaluateSignupQuality } from '@/lib/signupValidation';

// Rate limiting: 5 signup attempts per 10 minutes per IP
const SIGNUP_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientId(request.headers);
    const rateLimitCheck = checkRateLimit(clientId, SIGNUP_RATE_LIMIT);
    
    if (!rateLimitCheck.allowed) {
      const retryAfter = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'Too many signup attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    const body = await request.json();
    const { name, email, phone, countryCode, country, state, gender, age, profession, password } = body;
    const honeypot = body.website_url || body.honeypot || body.address_confirm || '';

    // Validate required fields
    const required = ['name', 'email', 'phone', 'country', 'state', 'gender', 'age', 'profession', 'password'];
    const validation = validateRequired(body, required);
    if (!validation.valid) {
      return apiError('VALIDATION_ERROR', `Missing fields: ${validation.missing?.join(', ')}`);
    }

    // Database connection for optional Mongo CRM records
    try {
      await connectDB();
    } catch (dbError) {
      logError('signup/connectDB', dbError);
      // We don't fail here because User creation happens in BunnyDB now.
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email format');
    }

    // Check if user already exists (case-insensitive)
    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return apiError('VALIDATION_ERROR', 'Email already registered');
      }
    } catch (checkError) {
      logError('signup/checkExisting', checkError);
      return apiError('DATABASE_ERROR', 'Failed to check existing user');
    }

    // Validate age
    const ageNumber = typeof age === 'string' ? parseInt(age, 10) : age;
    if (!Number.isFinite(ageNumber) || ageNumber < 13 || ageNumber > 150) {
      return apiError('VALIDATION_ERROR', 'Age must be between 13 and 150');
    }

    // Evaluate signup quality: detect bot signatures, gibberish names, disposable emails
    const quality = evaluateSignupQuality({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country: String(country || '').trim(),
      state: String(state || '').trim(),
      gender: String(gender || '').trim(),
      age: ageNumber,
      profession: String(profession || '').trim(),
      honeypot,
    });

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    } catch (hashError) {
      logError('signup/hashPassword', hashError);
      return apiError('SERVER_ERROR', 'Password processing failed');
    }

    // Create new user in BunnyDB
    let user;
    try {
      user = await upsertUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: hashedPassword,
        role: 'user',
        isAdmin: false,
        country: String(country || '').trim(),
        state: String(state || '').trim(),
        gender: String(gender || '').trim(),
        age: ageNumber,
        profession: String(profession || '').trim(),
        status: quality.status, // 'active' if proper details, 'pending' if suspicious/dummy
        approvalReason: quality.reasons.length ? quality.reasons.join('; ') : 'Auto-approved',
      });

  // If we can map the user to a CRM leadNumber, return it in the signup response.
  // This supports a single human-friendly identifier (e.g. "006999") across modules.
  let leadNumber: string | null = null;
  let leadNameDuplicateWarning: { code: string; message: string } | null = null;

      // ALSO: create/update CRM lead (Option A)
      // This makes every website signup visible in CRM leads immediately.
      try {
        const cleanedPhone = normalizePhone(phone || '');
        const cleanedEmail = String(email || '').trim().toLowerCase();
        const cleanedName = String(name || '').trim();
        const Lead = getLead();
        const meta = {
          formType: 'website-signup',
          userId: user.id,
          country: String(country || '').trim(),
          state: String(state || '').trim(),
          gender: String(gender || '').trim(),
          age: ageNumber,
          profession: String(profession || '').trim(),
          submittedAt: new Date(),
        };

        if (cleanedPhone) {
          // UNIFIED ID: Find by EITHER phone OR email (one person = one ID)
          const searchQuery: any[] = [{ phoneNumber: cleanedPhone }];
          if (cleanedEmail) searchQuery.push({ email: cleanedEmail });
          
          const existingLead = await Lead.findOne({ $or: searchQuery }).lean();
          if (existingLead) {
            // UPDATE EXISTING LEAD AND LINK TO USER ACCOUNT
            await Lead.updateOne(
              { _id: (existingLead as any)._id },
              {
                $setOnInsert: {
                  status: 'lead',
                  source: 'website',
                  workshopName: 'Website Signup',
                  labels: ['website', 'signup'],
                  createdByUserId: 'system',
                  assignedToUserId: 'admincrm',
                },
                $addToSet: {
                  labels: { $each: ['website', 'signup'] },
                },
                $set: {
                  ...(cleanedName ? { name: cleanedName } : {}),
                  ...(cleanedEmail ? { email: cleanedEmail } : {}),
                  metadata: meta,
                  // UNIFIED ID: Link Lead to User account
                  linkedUserId: user.id,
                  isLinkedToAccount: true,
                },
              },
              { upsert: false }
            );
            // Ensure even existing leads are added to broadcast list on signup
            await addLeadToMainBroadcastList(existingLead);

            leadNumber = String((existingLead as any).leadNumber || '') || null;
          } else {
            const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber();
            // CREATE NEW LEAD WITH USER LINK
            const newLead = await Lead.create({
              leadNumber: allocatedLeadNumber,
              name: cleanedName,
              email: cleanedEmail,
              phoneNumber: cleanedPhone,
              status: 'lead',
              source: 'website',
              workshopName: 'Website Signup',
              labels: ['website', 'signup'],
              createdByUserId: 'system',
              assignedToUserId: 'admincrm',
              metadata: meta,
              // UNIFIED ID: Link Lead to User account
              linkedUserId: user.id,
              isLinkedToAccount: true,
            });
            // Auto-add to main broadcast list
            await addLeadToMainBroadcastList(newLead);

            leadNumber = String((newLead as any).leadNumber || allocatedLeadNumber || '') || null;
          }

          // AUTO-JOIN to Global Community
          try {
            const existingGlobalMember = await CommunityMember.findOne({
              mobile: cleanedPhone,
              communityId: 'global',
            });
            
            if (!existingGlobalMember) {
              await CommunityMember.create({
                name: cleanedName,
                email: cleanedEmail,
                mobile: cleanedPhone,
                countryCode: countryCode || '+91',
                userId: leadNumber || user.id,
                communityId: 'global',
                communityName: 'Global Community',
                status: 'active',
                approved: true,
                joinedAt: new Date(),
                chatEnabled: true,
                chatPermissions: {
                  canSend: true,
                  allowText: true,
                  allowLinks: true,
                  allowImages: true,
                  allowVideos: true,
                  allowDocuments: true,
                },
              });
              console.log(`✅ Auto-joined ${cleanedName} to Global Community on signup`);
            }
          } catch (globalJoinError) {
            console.error('❌ Auto-join Global on signup failed:', globalJoinError);
            // Non-fatal: signup should still succeed
          }

          // Optional warning: same name exists in CRM. Public response must not leak PII.
          try {
            if (cleanedName) {
              const safe = cleanedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const total = await Lead.countDocuments({ name: { $regex: `^\\s*${safe}\\s*$`, $options: 'i' } });
              if (total > 1) {
                leadNameDuplicateWarning = {
                  code: 'NAME_DUPLICATE',
                  message: 'Same name already exists. Please confirm mobile/email is correct.',
                };
              }
            }
          } catch {
            // ignore warning lookup failures
          }
        }
      } catch (crmLeadError) {
        // Non-fatal: signup should still succeed even if CRM write fails.
        logError('signup/createCrmLead', crmLeadError);
      }

      // Handle Pending (Held for Admin Review) vs Active (Auto-Approved)
      if (quality.status === 'pending') {
        // DO NOT send welcome email to suspicious/dummy emails to prevent bounces.
        // Notify admin about the held signup so they can review and approve in /admin/signup-data.
        const { sendNotificationEmail } = await import('@/lib/notifications');
        const adminEmail = process.env.NOTIFICATION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'mohankalburgi@gmail.com';
        sendNotificationEmail(
          adminEmail,
          `⚠️ New Signup Held for Review (Pending Approval): ${user.name}`,
          `<p>A new signup was received with suspicious/incomplete details and held in <strong>Pending</strong> status:</p>
           <ul>
             <li><strong>Name:</strong> ${user.name}</li>
             <li><strong>Email:</strong> ${user.email}</li>
             <li><strong>Phone:</strong> ${user.phone}</li>
             <li><strong>Country / State:</strong> ${country} / ${state}</li>
             <li><strong>Detection Reason:</strong> ${quality.reasons.join(', ')}</li>
           </ul>
           <p><a href="https://swaryoga.com/admin/signup-data" style="display:inline-block;padding:8px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:4px;">Open Signup Data in Admin →</a></p>`
        ).catch(() => {});

        return apiSuccess({
          message: 'Your registration has been submitted and is pending review by admin. You will be notified once approved.',
          status: 'pending',
          requiresApproval: true,
          user: {
            id: user.id,
            leadNumber: leadNumber || undefined,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: 'pending',
          },
        }, 201);
      }

      // Generate token for auto-approved users
      let token;
      try {
        token = generateToken({
          userId: user.id,
          email: user.email,
        }, '365d');
      } catch (tokenError) {
        logError('signup/generateToken', tokenError);
        return apiError('SERVER_ERROR', 'Token generation failed');
      }

      // Fire-and-forget: Send signup confirmation email for auto-approved real users
      notifySignupConfirmation(
        { name: user.name, email: user.email, phone: user.phone },
        { leadNumber: leadNumber || undefined },
      ).catch(err => console.error('[Signup] Notification error:', err));

      return apiSuccess({
        message: 'User registered successfully',
        token,
        status: 'active',
        ...(leadNameDuplicateWarning ? { warning: leadNameDuplicateWarning } : {}),
        user: {
          id: user.id,
          leadNumber: leadNumber || undefined,
          name: user.name,
          email: user.email,
          phone: user.phone,
          country: country,
          state: state,
          gender: gender,
          age: ageNumber,
          profession: profession,
          status: 'active',
        },
      }, 201);
    } catch (createError: any) {
      logError('signup/createUser', createError);

      // Handle MongoDB unique constraint error
      if (createError.code === 11000) {
        return apiError('VALIDATION_ERROR', 'Email already registered');
      }

      // Handle validation errors
      if (createError.name === 'ValidationError') {
        const messages = Object.values(createError.errors)
          .map((err: any) => err.message)
          .join('; ');
        return apiError('VALIDATION_ERROR', `Validation error: ${messages}`);
      }

      return apiError('SERVER_ERROR', 'Failed to create user');
    }
  } catch (error) {
    logError('signup/POST', error);
    return apiError('SERVER_ERROR');
  }
}
