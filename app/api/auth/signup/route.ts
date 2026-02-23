/**
 * @fileoverview User Signup Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, CommunityMember } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { notifySignupConfirmation } from '@/lib/notifications';

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

    // Validate required fields
    const required = ['name', 'email', 'phone', 'country', 'state', 'gender', 'age', 'profession', 'password'];
    const validation = validateRequired(body, required);
    if (!validation.valid) {
      return apiError('VALIDATION_ERROR', `Missing fields: ${validation.missing?.join(', ')}`);
    }

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      logError('signup/connectDB', dbError);
      return apiError('DATABASE_ERROR', 'Database connection failed');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email format');
    }

    // Check if user already exists (case-insensitive)
    try {
      const trimmedEmail = email.trim();
      const existingUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${trimmedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
      }).lean();
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

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    } catch (hashError) {
      logError('signup/hashPassword', hashError);
      return apiError('SERVER_ERROR', 'Password processing failed');
    }

    // Create new user
    try {
      const user = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode: countryCode || '+91',
        country: country.trim(),
        state: state.trim(),
        gender: gender.trim(),
        age: ageNumber,
        profession: profession.trim(),
        password: hashedPassword,
      });

      await user.save();

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
          userId: user._id.toString(),
          profileId: (user as any)?.profileId,
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
                  assignedToUserId: 'system',
                },
                $addToSet: {
                  labels: { $each: ['website', 'signup'] },
                },
                $set: {
                  ...(cleanedName ? { name: cleanedName } : {}),
                  ...(cleanedEmail ? { email: cleanedEmail } : {}),
                  metadata: meta,
                  // UNIFIED ID: Link Lead to User account
                  linkedUserId: user._id,
                  linkedProfileId: (user as any).profileId,
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
              assignedToUserId: 'system',
              metadata: meta,
              // UNIFIED ID: Link Lead to User account
              linkedUserId: user._id,
              linkedProfileId: (user as any).profileId,
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
                userId: leadNumber || user._id.toString(),
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

      // Generate token
      let token;
      try {
        token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });
      } catch (tokenError) {
        logError('signup/generateToken', tokenError);
        return apiError('SERVER_ERROR', 'Token generation failed');
      }

      // Fire-and-forget: Send signup confirmation email
      notifySignupConfirmation(
        { name: user.name, email: user.email, phone: user.phone },
        { leadNumber: leadNumber || undefined, profileId: (user as any).profileId },
      ).catch(err => console.error('[Signup] Notification error:', err));

      return apiSuccess({
        message: 'User registered successfully',
        token,
        ...(leadNameDuplicateWarning ? { warning: leadNameDuplicateWarning } : {}),
        user: {
          id: user._id,
          profileId: user.profileId,
          leadNumber: leadNumber || undefined,
          name: user.name,
          email: user.email,
          phone: user.phone,
          country: user.country,
          state: user.state,
          gender: user.gender,
          age: user.age,
          profession: user.profession,
          profileImage: user.profileImage,
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
