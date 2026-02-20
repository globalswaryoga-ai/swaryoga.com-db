import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * Send credentials via WhatsApp + Email (fire-and-forget)
 */
async function sendCredentialsAsync(phone: string, name: string, email: string, password: string, leadNumber: string) {
  try {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // WhatsApp notification
    if (WHATSAPP_TOKEN && PHONE_NUMBER_ID) {
      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
      const waMessage = `Welcome to Swar Yoga! 🧘\n\nYour account has been created.\n\n🔐 Login Credentials:\nLead ID: ${leadNumber}\nEmail: ${email}\nPassword: ${password}\n\nLogin: https://swaryoga.com/signin\n\nHar Har Mahadev 🙏`;

      fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'text',
          text: { body: waMessage },
        }),
      }).then(r => {
        if (r.ok) console.log(`✅ WhatsApp credentials sent to ${fullPhone}`);
        else console.error('❌ WhatsApp send failed');
      }).catch(e => console.error('WhatsApp error:', e));
    }

    // Email notification
    if (RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Swar Yoga <noreply@swaryoga.com>',
          to: email,
          subject: '🧘 Welcome to Swar Yoga - Your Login Credentials',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0">
              <h1 style="color:white;margin:0">🧘 Welcome to Swar Yoga!</h1>
            </div>
            <div style="background:#f9fafb;padding:30px;border-radius:0 0 10px 10px">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your account has been created successfully!</p>
              <div style="background:white;border:2px solid #10b981;border-radius:10px;padding:20px;margin:20px 0">
                <h3 style="margin-top:0;color:#10b981">🔐 Your Login Credentials</h3>
                <p><strong>Lead ID:</strong> ${leadNumber}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              <p>⚠️ Please save these credentials safely!</p>
              <center><a href="https://swaryoga.com/signin" style="display:inline-block;background:#10b981;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:bold">Login Now →</a></center>
              <p style="margin-top:30px">Namaste! 🙏</p>
            </div>
          </div>`,
        }),
      }).then(r => {
        if (r.ok) console.log(`✅ Email credentials sent to ${email}`);
        else console.error('❌ Email send failed');
      }).catch(e => console.error('Email error:', e));
    }
  } catch (error) {
    console.error('sendCredentialsAsync error:', error);
  }
}

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Public website endpoint:
// - creates/updates a CRM Lead (so it appears in /admin/crm/leads)
// - returns a permanent 6-digit leadNumber
//
// NOTE: This endpoint is intentionally unauthenticated because it's used from the public workshop form.
// We keep it minimal and safe (validation + phone normalization + duplicate handling).

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return apiError('INVALID_REQUEST', 'Invalid JSON body');

    const workshopId = String(body.workshopId || '').trim();
    const workshopName = String(body.workshopName || '').trim();
    const month = String(body.month || '').trim();
    const mode = String(body.mode || '').trim();
    const language = String(body.language || '').trim();

    const name = String(body.name || '').trim();
    const mobileRaw = String(body.mobile || '').trim();
    const emailRaw = String(body.email || '').trim();
    const gender = String(body.gender || '').trim();
    const city = String(body.city || '').trim();
    const password = String(body.password || '').trim(); // Optional: user-chosen password
    const priceInr = typeof body.priceInr === 'number' ? body.priceInr : Number(body.priceInr || 0) || 0;

    if (!workshopId || !workshopName || !name || !mobileRaw || !emailRaw || !gender || !city) {
      return apiError('VALIDATION_ERROR', 'Missing required fields');
    }

    if (!emailRaw.includes('@')) {
      return apiError('VALIDATION_ERROR', 'Invalid email');
    }

    const phoneNumber = normalizePhone(mobileRaw);
    if (!phoneNumber) {
      return apiError('VALIDATION_ERROR', 'Invalid mobile number');
    }

    await connectDB();
    const Lead = getLead();

    // Optional warning: duplicate name exists in CRM (public endpoint: do not return PII).
    let warning: any = null;
    try {
      if (name) {
        const safe = escapeRegexLiteral(name);
        const total = await Lead.countDocuments({ name: { $regex: `^\\s*${safe}\\s*$`, $options: 'i' } });
        if (total > 1) {
          warning = {
            code: 'NAME_DUPLICATE',
            message: 'Same name already exists. Please confirm mobile/email is correct before proceeding.',
            count: total,
          };
        }
      }
    } catch {
      // ignore
    }

    // Find by phone first (primary). If not found, fall back to email.
    const existing = await Lead.findOne({
      $or: [{ phoneNumber }, ...(emailRaw ? [{ email: emailRaw.toLowerCase() }] : [])],
    });

    if (existing) {
      // Ensure leadNumber exists.
      if (!existing.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        existing.leadNumber = leadNumber;
      }

      // Update fields opportunistically.
      existing.name = existing.name || name;
      existing.email = existing.email || emailRaw.toLowerCase();
      existing.phoneNumber = phoneNumber;
      existing.city = (existing as any).city || city;
      (existing as any).gender = (existing as any).gender || gender;
      (existing as any).source = (existing as any).source || 'website';
      // Add 'website' label
      if (!existing.labels || !existing.labels.includes('website')) {
        existing.labels = Array.from(new Set([...(existing.labels || []), 'website']));
      }
      (existing as any).workshopId = (existing as any).workshopId || workshopId;
      (existing as any).workshopName = (existing as any).workshopName || workshopName;
      (existing as any).lastFormAt = new Date();
      (existing as any).lastFormMeta = {
        month,
        mode,
        language,
        priceInr,
      };

      await existing.save();

      // Check if this lead has a linked User account
      const existingUser = await User.findOne({
        $or: [
          { email: emailRaw.toLowerCase() },
          { phone: phoneNumber },
        ],
      }).select('_id profileId name email').lean();

      return apiSuccess({
        leadNumber: existing.leadNumber,
        leadId: String(existing._id),
        updated: true,
        userExists: !!existingUser,
        profileId: (existingUser as any)?.profileId || '',
        ...(warning ? { warning } : {}),
      });
    }

    const { leadNumber } = await allocateNextLeadNumber();

    const lead = await Lead.create({
      leadNumber,
      name,
      email: emailRaw.toLowerCase(),
      phoneNumber,
      source: 'website',
      labels: ['website'],
      status: 'lead',
      // workshop fields (schema supports these in CRM routes)
      workshopId,
      workshopName,
      // extra form meta
      city,
      gender,
      lastFormAt: new Date(),
      lastFormMeta: {
        month,
        mode,
        language,
        priceInr,
      },
    });

    // Create User account if password provided (new user)
    let createdUser: any = null;
    let token: string | undefined;

    if (password && password.length >= 6) {
      try {
        // Double-check no existing user
        const existingUser = await User.findOne({
          $or: [
            { email: emailRaw.toLowerCase() },
            { phone: phoneNumber },
          ],
        }).lean();

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const newUser = new User({
            name,
            email: emailRaw.toLowerCase(),
            phone: phoneNumber,
            countryCode: '+91',
            gender: gender || undefined,
            password: hashedPassword,
          });
          await newUser.save();
          createdUser = newUser;

          // Link lead to user
          await Lead.updateOne(
            { _id: lead._id },
            { $set: { linkedUserId: newUser._id, isLinkedToAccount: true } }
          );

          // Generate auth token
          token = generateToken({
            userId: newUser._id.toString(),
            email: newUser.email,
          });

          console.log(`✅ User account created for workshop lead: ${emailRaw}`);

          // Send credentials via WhatsApp + Email (async, don't block)
          sendCredentialsAsync(phoneNumber, name, emailRaw, password, String(leadNumber));
        }
      } catch (userError) {
        console.error('User creation error (non-fatal):', userError);
        // Non-fatal: lead is already created
      }
    }

    return apiSuccess(
      {
        leadNumber,
        leadId: String(lead._id),
        created: true,
        userCreated: !!createdUser,
        profileId: createdUser?.profileId || '',
        ...(token ? { token } : {}),
        ...(warning ? { warning } : {}),
      },
      201
    );
  } catch (error) {
    console.error('❌ POST /api/workshop-leads error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to submit form';
    return apiError('SERVER_ERROR', 'Failed to submit form', msg);
  }
}
