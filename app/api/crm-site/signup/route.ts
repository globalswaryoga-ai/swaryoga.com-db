import { NextRequest, NextResponse } from 'next/server';
import crypto, { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '@/lib/crm-site/emailService';
import { logError } from '@/lib/api-error';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import { setTenantKey } from '@/lib/tenant/apiKeyVault';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

const STARTING_TENANT_CODE = 2456;

function sanitizeFolderName(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return (normalized || 'crm-user').slice(0, 48);
}

function resolveStoragePlan(plan: string) {
  if (plan === 'growth') return 'growth';
  if (plan === 'professional') return 'pro';
  return 'starter';
}

async function ensureAllSignupTables() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS admin_users_sql (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 1,
        role TEXT DEFAULT 'admin',
        permissions_json TEXT NOT NULL DEFAULT '[]',
        permissions_v2_json TEXT,
        managed_user_ids_json TEXT NOT NULL DEFAULT '[]',
        tenant_slug TEXT,
        name TEXT,
        phone TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT,
        updated_at TEXT,
        last_login_at TEXT,
        migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id),
        UNIQUE(email)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS crm_tenants_sql (
        tenant_slug TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS crm_user_settings_sql (
        user_id TEXT PRIMARY KEY,
        permanent_tenant_id TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS user_compartments_sql (
        user_id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);
}

async function generatePermanentTenantId(): Promise<string> {
  try {
    const res = await bunnyExecute('SELECT permanent_tenant_id FROM crm_user_settings_sql WHERE permanent_tenant_id IS NOT NULL ORDER BY permanent_tenant_id DESC LIMIT 1');
    if (res.rows.length > 0 && res.rows[0].permanent_tenant_id) {
      const parsed = parseInt(String(res.rows[0].permanent_tenant_id), 10);
      if (!isNaN(parsed) && parsed >= STARTING_TENANT_CODE) {
        return String(parsed + 1).padStart(7, '0');
      }
    }
  } catch {
    // fallback if table is fresh
  }
  return String(STARTING_TENANT_CODE).padStart(7, '0');
}

/**
 * POST /api/crm-site/signup
 * Pure Bunny Database tenant provisioning.
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logError('crm-signup/parseBody', parseError);
      return jsonResponse({ error: 'Invalid request body', success: false }, 400);
    }
    const {
      businessName,
      fullName,
      email,
      phone,
      password,
      whatsappPhoneId,
      whatsappAccessToken,
      cashfreeClientId,
      cashfreeClientSecret,
      retellApiKey,
      plan = 'free',
    } = body;

    /* ─── Validate required fields ─── */
    const fieldErrors: { field: string; message: string }[] = [];

    if (!businessName?.trim()) fieldErrors.push({ field: 'businessName', message: 'Business name is required' });
    if (!fullName?.trim()) fieldErrors.push({ field: 'fullName', message: 'Full name is required' });
    if (!email?.trim()) fieldErrors.push({ field: 'email', message: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.push({ field: 'email', message: 'Invalid email' });
    if (!phone?.trim()) fieldErrors.push({ field: 'phone', message: 'Phone is required' });
    if (!password || password.length < 6) fieldErrors.push({ field: 'password', message: 'Password must be at least 6 characters' });

    if (fieldErrors.length > 0) {
      return jsonResponse({ error: 'Validation failed', fieldErrors, success: false }, 400);
    }

    await ensureAllSignupTables();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = fullName.trim();
    const cleanBusiness = businessName.trim();

    /* ─── Check duplicate email in BunnyDB ─── */
    const existing = await bunnyExecute({
      sql: 'SELECT id, email FROM admin_users_sql WHERE LOWER(email) = ? OR LOWER(user_id) = ? LIMIT 1',
      args: [cleanEmail, cleanEmail],
    });

    if (existing.rows.length > 0) {
      return jsonResponse(
        {
          error: 'An account with this email already exists. Please log in instead.',
          fieldErrors: [{ field: 'email', message: 'Email already registered' }],
          success: false,
        },
        409
      );
    }

    /* ─── Create slug from business name ─── */
    const baseSlug = cleanBusiness
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'tenant';

    // Ensure slug uniqueness
    const slugCheck = await bunnyExecute({
      sql: 'SELECT tenant_slug FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1',
      args: [baseSlug],
    });
    const finalSlug = slugCheck.rows.length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    /* ─── Hash password ─── */
    const hashedPassword = await bcrypt.hash(password, 12);

    /* ─── Plan selection ─── */
    const validPlans = ['free', 'basic', 'starter', 'copper', 'growth', 'silver', 'professional', 'golden', 'diamond'];
    const selectedPlan = validPlans.includes(plan.toLowerCase()) ? plan.toLowerCase() : 'free';
    const permanentTenantId = await generatePermanentTenantId();
    const qrBridgeSecret = randomBytes(16).toString('hex');
    const folderName = sanitizeFolderName(finalSlug);
    const compartmentId = `comp_${randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();
    const docId = `tenant_${randomBytes(12).toString('hex')}`;
    const userRowId = `user_${randomBytes(12).toString('hex')}`;

    /* ─── 1. Insert into admin_users_sql ─── */
    await bunnyExecute({
      sql: `
        INSERT INTO admin_users_sql (
          id, user_id, email, password_hash, is_admin, role,
          tenant_slug, name, phone, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 'admin', ?, ?, ?, ?, ?, ?)
      `,
      args: [
        userRowId,
        cleanEmail,
        cleanEmail,
        hashedPassword,
        finalSlug,
        cleanName,
        cleanPhone,
        JSON.stringify({ plan: selectedPlan, storageLimitMB: 500, storageUsedMB: 0 }),
        now,
        now,
      ],
    });

    /* ─── 2. Insert into crm_tenants_sql ─── */
    const tenantPayload = {
      _id: docId,
      slug: finalSlug,
      tenantSlug: finalSlug,
      name: cleanBusiness,
      ownerEmail: cleanEmail,
      ownerUserId: cleanEmail,
      ownerName: cleanName,
      ownerPhone: cleanPhone,
      adminEmail: cleanEmail,
      adminUserId: cleanEmail,
      plan: selectedPlan,
      status: 'active',
      dbName: `tenant_${finalSlug.replace(/[^a-z0-9_]/g, '_')}`,
      subdomain: finalSlug,
      enabledModules: ['crm'],
      branding: { primaryColor: '#10B981' },
      subscription: {
        plan: selectedPlan,
        status: selectedPlan === 'free' ? 'trial' : 'active',
        startDate: now,
      },
      currentLeadCount: 0,
      currentUserCount: 1,
      currentStorageMB: 0,
      createdAt: now,
      updatedAt: now,
    };

    await bunnyExecute({
      sql: `
        INSERT INTO crm_tenants_sql (tenant_slug, document_id, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [finalSlug, docId, JSON.stringify(tenantPayload), now, now],
    });

    /* ─── 3. Insert into crm_user_settings_sql ─── */
    const settingsPayload = {
      userId: cleanEmail,
      email: cleanEmail,
      permanentTenantId,
      qrBridgeSecret,
      qrWhatsappEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    await bunnyExecute({
      sql: `
        INSERT INTO crm_user_settings_sql (user_id, permanent_tenant_id, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
      `,
      args: [cleanEmail, permanentTenantId, JSON.stringify(settingsPayload), now, now],
    });

    /* ─── 4. Insert into user_compartments_sql ─── */
    const compartmentPayload = {
      userId: cleanEmail,
      email: cleanEmail,
      compartmentId,
      folderName,
      bunny: {
        folderPath: `users/${folderName}/`,
        folderCreated: false,
        cdnUrl: '',
      },
      storage: {
        quotaMB: 500,
        usedMB: 0,
        plan: resolveStoragePlan(selectedPlan),
      },
      setup: {
        isComplete: false,
        steps: {
          folderNameChosen: true,
          storagePurchased: false,
          bunnyFolderCreated: false,
          connectionVerified: false,
        },
      },
      subscription: {
        plan: selectedPlan,
        billing: 'monthly',
        status: 'active',
        startDate: now,
      },
      isActive: true,
      metadata: {
        provisionedBy: 'crm-site-signup',
        tenantSlug: finalSlug,
      },
      createdAt: now,
      updatedAt: now,
    };

    await bunnyExecute({
      sql: `
        INSERT INTO user_compartments_sql (user_id, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
      `,
      args: [cleanEmail, JSON.stringify(compartmentPayload), now, now],
    });

    /* ─── 5. Store API keys encrypted in BunnyDB if provided ─── */
    const keysToStore: { keyName: string; keyValue: string }[] = [];
    if (whatsappPhoneId?.trim()) keysToStore.push({ keyName: 'WHATSAPP_PHONE_NUMBER_ID', keyValue: whatsappPhoneId.trim() });
    if (whatsappAccessToken?.trim()) keysToStore.push({ keyName: 'WHATSAPP_ACCESS_TOKEN', keyValue: whatsappAccessToken.trim() });
    if (cashfreeClientId?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_ID', keyValue: cashfreeClientId.trim() });
    if (cashfreeClientSecret?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_SECRET', keyValue: cashfreeClientSecret.trim() });
    if (retellApiKey?.trim()) keysToStore.push({ keyName: 'RETELL_API_KEY', keyValue: retellApiKey.trim() });

    if (keysToStore.length > 0) {
      try {
        for (const k of keysToStore) {
          await setTenantKey(finalSlug, k.keyName, k.keyValue);
        }
      } catch (vaultErr) {
        console.warn('[crm-signup] Failed to store some API keys (non-fatal):', vaultErr);
      }
    }

    /* ─── 6. Generate JWT ─── */
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'swar-yoga-default-secret';
    const token = jwt.sign(
      {
        userId: cleanEmail,
        email: cleanEmail,
        name: cleanName,
        role: 'admin',
        isAdmin: true,
        tenantSlug: finalSlug,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    /* ─── 7. Async welcome email ─── */
    sendWelcomeEmail({
      customerName: cleanName,
      customerEmail: cleanEmail,
      tenantSlug: finalSlug,
    }).catch((err) => console.error('[crm-signup] Failed to send welcome email:', err));

    return jsonResponse({
      success: true,
      token,
      userId: cleanEmail,
      user: {
        userId: cleanEmail,
        email: cleanEmail,
        name: cleanName,
        role: 'admin',
        isAdmin: true,
        tenantSlug: finalSlug,
        plan: selectedPlan,
        permanentTenantId,
      },
    });
  } catch (err: any) {
    logError('crm-signup/main', err);
    return jsonResponse(
      { error: err.message || 'Failed to create account. Please try again.', success: false },
      500
    );
  }
}
