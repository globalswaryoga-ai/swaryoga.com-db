import { NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { normalizePhone } from '@/lib/whatsapp';
import { getBunnyLeadByPhone, getBunnyLeadByEmail, saveBunnyLead, listBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { generateToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

/**
 * Send credentials via WhatsApp + Email (fire-and-forget)
 */
async function sendCredentialsAsync(phone: string, name: string, email: string, password: string, leadNumber: string) {
  try {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

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
      }).catch(e => console.error('WhatsApp error:', e));
    }

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
      }).catch(e => console.error('Email error:', e));
    }
  } catch (error) {
    console.error('sendCredentialsAsync error:', error);
  }
}

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const password = String(body.password || '').trim();
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

    let warning: any = null;
    try {
      if (name) {
        const query = name.toLowerCase();
        const existingLeads = await listBunnyLeads({ visibleUserIds: null, viewerUserId: 'system', skip: 0, limit: 100, q: query });
        const exactMatches = existingLeads.leads.filter(l => l.name?.toLowerCase() === query);
        if (exactMatches.length > 1) {
          warning = {
            code: 'NAME_DUPLICATE',
            message: 'Same name already exists. Please confirm mobile/email is correct before proceeding.',
            count: exactMatches.length,
          };
        }
      }
    } catch {
      // ignore
    }

    let existing = await getBunnyLeadByPhone(phoneNumber);
    if (!existing) {
      existing = await getBunnyLeadByEmail(emailRaw);
    }

    if (existing) {
      if (!existing.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber('system');
        existing.leadNumber = leadNumber;
      }

      existing.name = existing.name || name;
      existing.email = existing.email || emailRaw.toLowerCase();
      existing.phoneNumber = phoneNumber;
      existing.city = existing.city || city;
      existing.gender = existing.gender || gender;
      existing.source = existing.source || 'website';
      
      if (!existing.labels || !existing.labels.includes('website')) {
        existing.labels = Array.from(new Set([...(existing.labels || []), 'website']));
      }
      existing.workshopId = existing.workshopId || workshopId;
      existing.workshopName = existing.workshopName || workshopName;
      existing.lastFormAt = new Date().toISOString();
      existing.lastFormMeta = { month, mode, language, priceInr };

      await saveBunnyLead(existing, existing._id);

      return apiSuccess({
        leadNumber: existing.leadNumber,
        leadId: String(existing._id),
        updated: true,
        userExists: false, // We don't query User collection anymore
        profileId: '',
        ...(warning ? { warning } : {}),
      });
    }

    const { leadNumber } = await allocateNextLeadNumber('system');

    const lead = {
      leadNumber,
      name,
      email: emailRaw.toLowerCase(),
      phoneNumber,
      source: 'website',
      labels: ['website'],
      status: 'lead',
      workshopId,
      workshopName,
      city,
      gender,
      lastFormAt: new Date().toISOString(),
      lastFormMeta: { month, mode, language, priceInr },
    };
    
    await saveBunnyLead(lead);

    let token: string | undefined;

    if (password && password.length >= 6) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Ensure admin_users_sql exists
        await bunnyExecute({
          sql: `CREATE TABLE IF NOT EXISTS admin_users_sql (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL, email TEXT NOT NULL,
            password_hash TEXT NOT NULL, is_admin INTEGER NOT NULL DEFAULT 1,
            role TEXT, permissions_json TEXT NOT NULL DEFAULT '[]',
            permissions_v2_json TEXT, managed_user_ids_json TEXT NOT NULL DEFAULT '[]',
            tenant_slug TEXT, name TEXT, phone TEXT,
            metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT, updated_at TEXT,
            last_login_at TEXT, migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id), UNIQUE(email)
          )`
        });

        const userId = crypto.randomUUID();
        await bunnyExecute({
          sql: `INSERT INTO admin_users_sql (
            id, user_id, email, password_hash, is_admin, role, name, phone, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`,
          args: [
            userId, userId, emailRaw.toLowerCase(), hashedPassword, 0, 'user', name, phoneNumber,
            new Date().toISOString(), new Date().toISOString()
          ]
        });

        token = generateToken({
          userId: userId,
          email: emailRaw.toLowerCase(),
        });

        sendCredentialsAsync(phoneNumber, name, emailRaw, password, String(leadNumber));
      } catch (userError) {
        console.error('User creation error (non-fatal):', userError);
      }
    }

    return apiSuccess(
      {
        leadNumber,
        leadId: leadNumber, // Using leadNumber as ID proxy since _id isn't returned here
        created: true,
        userCreated: !!token,
        profileId: '',
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
