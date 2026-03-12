import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { sendWelcomeEmail } from '@/lib/crm-site/emailService';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { getCRMUserSettings, getUserCompartment } from '@/lib/schemas/enterpriseSchemas';
import { createDefaultSetup } from '@/lib/crm-site/tenantSetupConfig';

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

// Helper to return JSON with CORS headers
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

async function generatePermanentTenantId(CRMUserSettings: ReturnType<typeof getCRMUserSettings>) {
  const latest = await CRMUserSettings.findOne({
    permanentTenantId: { $regex: '^[0-9]{7}$' },
  })
    .sort({ permanentTenantId: -1 })
    .select({ permanentTenantId: 1 })
    .lean() as { permanentTenantId?: string } | null;

  let nextCode = latest?.permanentTenantId && /^\d{7}$/.test(latest.permanentTenantId)
    ? parseInt(latest.permanentTenantId, 10) + 1
    : STARTING_TENANT_CODE;

  while (await CRMUserSettings.exists({ permanentTenantId: String(nextCode).padStart(7, '0') })) {
    nextCode += 1;
  }

  return String(nextCode).padStart(7, '0');
}

/**
 * POST /api/crm-site/signup
 *
 * Creates a new CRM tenant account:
 * 1. Validates input
 * 2. Creates admin user in the main database
 * 3. Creates a tenant record
 * 4. Optionally stores encrypted API keys (WhatsApp, Cashfree, Retell)
 * 5. Returns JWT for immediate login
 *
 * Does NOT disturb existing site or CRM — uses separate collections.
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

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const mainDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const CRMUserSettings = getCRMUserSettings();
    const UserCompartment = getUserCompartment();

    /* ─── Check duplicate email ─── */
    const existingUser = await mainDb.collection('admin_users').findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { userId: email.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
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
    const slug = businessName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    // Check slug uniqueness
    const existingTenant = await mainDb.collection('tenants').findOne({ slug });
    const finalSlug = existingTenant ? `${slug}-${Date.now().toString(36)}` : slug;

    /* ─── Hash password ─── */
    const hashedPassword = await bcrypt.hash(password, 12);

    /* ─── Create tenant record ─── */
    const validPlans = ['free', 'basic', 'starter', 'growth', 'professional'];
    const selectedPlan = validPlans.includes(plan) ? plan : 'free';
    const permanentTenantId = await generatePermanentTenantId(CRMUserSettings);
    const qrBridgeSecret = randomBytes(16).toString('hex');

    /* ─── Create admin user ─── */
    const now = new Date();
    const userId = email.trim().toLowerCase();
    const folderName = sanitizeFolderName(finalSlug);
    const compartmentId = `comp_${randomBytes(8).toString('hex')}`;

    await mainDb.collection('admin_users').insertOne({
      userId,
      email: userId,
      password: hashedPassword,
      name: fullName.trim(),
      phone: phone.trim(),
      role: 'admin',
      isAdmin: true,
      tenantSlug: finalSlug,
      planId: selectedPlan,
      planName: selectedPlan,
      setupComplete: false,
      loginCount: 0,
      storageLimitMB: 500,
      storageUsedMB: 0,
      createdAt: now,
      updatedAt: now,
    });

    await mainDb.collection('tenants').insertOne({
      slug: finalSlug,
      tenantSlug: finalSlug,
      name: businessName.trim(),
      plan: selectedPlan,
      ownerEmail: userId,
      ownerUserId: userId,
      ownerName: fullName.trim(),
      ownerPhone: phone.trim(),
      status: 'active',
      enabledModules: ['crm'], // base module
      customLimits: {},
      subscription: {
        plan: selectedPlan,
        status: selectedPlan === 'free' ? 'trial' : 'active',
        startDate: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    /* ─── Create CRM-site SaaS records for QR-first onboarding ─── */
    await CRMUserSettings.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          email: userId,
          permanentTenantId,
          qrBridgeSecret,
          qrWhatsappEnabled: false,
          createdAt: now,
        },
        $set: {
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await UserCompartment.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          email: userId,
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
          mongodb: {
            setupComplete: false,
            indexesCreated: false,
          },
          setup: {
            isComplete: false,
            steps: {
              folderNameChosen: true,
              storagePurchased: false,
              bunnyFolderCreated: false,
              mongodbConfigured: false,
              connectionVerified: false,
            },
          },
          subscription: {
            plan: selectedPlan,
            billing: 'monthly',
            status: selectedPlan === 'free' ? 'trial' : 'active',
            startDate: now,
            trialStartDate: now,
            trialEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            trialUsed: false,
          },
          isActive: true,
          lastActivityAt: now,
          metadata: {
            provisionedBy: 'crm-site-signup',
            tenantSlug: finalSlug,
          },
          createdAt: now,
        },
        $set: {
          updatedAt: now,
          lastActivityAt: now,
        },
      },
      { upsert: true }
    );

    const crmTenantDoc = {
      slug: finalSlug,
      tenantSlug: finalSlug,
      name: businessName.trim(),
      ownerEmail: userId,
      ownerUserId: userId,
      ownerName: fullName.trim(),
      ownerPhone: phone.trim(),
      adminEmail: userId,
      adminUserId: userId,
      plan: selectedPlan,
      status: 'active',
      branding: {
        primaryColor: '#3B82F6',
      },
      subscription: {
        plan: selectedPlan,
        status: selectedPlan === 'free' ? 'trial' : 'active',
        startDate: now,
      },
      enabledModules: ['crm'],
      createdAt: now,
      updatedAt: now,
    };

    const crmTenantUpsert = await mainDb.collection('crm_tenants').updateOne(
      { slug: finalSlug },
      { $setOnInsert: crmTenantDoc, $set: { updatedAt: now } },
      { upsert: true }
    );

    const crmTenantId = crmTenantUpsert.upsertedId
      ? crmTenantUpsert.upsertedId.toString()
      : (await mainDb.collection('crm_tenants').findOne(
          { slug: finalSlug },
          { projection: { _id: 1 } }
        ))?._id?.toString() || finalSlug;

    const setupTemplate = createDefaultSetup(finalSlug, selectedPlan);
    setupTemplate.tenantId = crmTenantId;
    setupTemplate.business = {
      ...setupTemplate.business,
      businessName: businessName.trim(),
      adminName: fullName.trim(),
      adminEmail: userId,
      adminPhone: phone.trim(),
    };
    setupTemplate.domain = {
      ...setupTemplate.domain,
      subdomain: finalSlug,
    };
    if (whatsappPhoneId?.trim()) setupTemplate.whatsapp.phoneNumberId = whatsappPhoneId.trim();
    if (whatsappAccessToken?.trim()) setupTemplate.whatsapp.accessToken = whatsappAccessToken.trim();
    setupTemplate.setupProgress.business = {
      ...setupTemplate.setupProgress.business,
      completed: true,
      completedAt: now,
    };
    setupTemplate.setupProgress.domain = {
      ...setupTemplate.setupProgress.domain,
      completed: true,
      completedAt: now,
    };
    setupTemplate.createdAt = now;
    setupTemplate.updatedAt = now;

    await mainDb.collection('tenant_setup').updateOne(
      { tenantSlug: finalSlug },
      { $setOnInsert: setupTemplate, $set: { updatedAt: now } },
      { upsert: true }
    );

    /* ─── Store API keys (encrypted) if provided ─── */
    const keysToStore: { keyName: string; keyValue: string }[] = [];

    if (whatsappPhoneId?.trim()) keysToStore.push({ keyName: 'WHATSAPP_PHONE_NUMBER_ID', keyValue: whatsappPhoneId.trim() });
    if (whatsappAccessToken?.trim()) keysToStore.push({ keyName: 'WHATSAPP_ACCESS_TOKEN', keyValue: whatsappAccessToken.trim() });
    if (cashfreeClientId?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_ID', keyValue: cashfreeClientId.trim() });
    if (cashfreeClientSecret?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_SECRET', keyValue: cashfreeClientSecret.trim() });
    if (retellApiKey?.trim()) keysToStore.push({ keyName: 'RETELL_API_KEY', keyValue: retellApiKey.trim() });

    if (keysToStore.length > 0) {
      try {
        // Use the apiKeyVault for encrypted storage
        const { setTenantKey } = await import('@/lib/tenant/apiKeyVault');
        for (const k of keysToStore) {
          await setTenantKey(finalSlug, k.keyName, k.keyValue);
        }
      } catch (vaultErr) {
        // Non-fatal — keys can be added later from Settings
        console.warn('Failed to store some API keys (non-fatal):', vaultErr);
      }
    }

    /* ─── Generate JWT ─── */
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'swar-yoga-default-secret';
    const token = jwt.sign(
      {
        userId,
        email: userId,
        name: fullName.trim(),
        role: 'admin',
        isAdmin: true,
        tenantSlug: finalSlug,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    /* ─── Send welcome email (async, non-blocking) ─── */
    sendWelcomeEmail({
      customerName: fullName.trim(),
      customerEmail: userId,
      tenantSlug: finalSlug,
    }).catch(err => console.error('Failed to send welcome email:', err));

    return jsonResponse({
      success: true,
      token,
      userId,
      user: {
        userId,
        email: userId,
        name: fullName.trim(),
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
      { error: 'Failed to create account. Please try again.', success: false },
      500
    );
  }
}
