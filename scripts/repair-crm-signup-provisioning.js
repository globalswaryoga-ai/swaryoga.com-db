#!/usr/bin/env node
/**
 * Repair legacy CRM signup provisioning for a specific user.
 *
 * Safe usage pattern:
 *   USER_EMAIL='legacy@example.com' TENANT_SLUG='legacy-crm' BUSINESS_NAME='Legacy CRM' node scripts/repair-crm-signup-provisioning.js --dry-run
 *   USER_EMAIL='legacy@example.com' TENANT_SLUG='legacy-crm' BUSINESS_NAME='Legacy CRM' node scripts/repair-crm-signup-provisioning.js
 *
 * Creates missing:
 * - admin_users.tenantSlug (if absent and TENANT_SLUG provided)
 * - tenants
 * - crm_tenants
 * - tenant_setup
 *
 * Does NOT modify passwords or existing QR settings.
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const USER_EMAIL = (process.env.USER_EMAIL || '').trim().toLowerCase();
const TENANT_SLUG_INPUT = (process.env.TENANT_SLUG || '').trim().toLowerCase();
const BUSINESS_NAME = (process.env.BUSINESS_NAME || '').trim();
const PHONE = (process.env.PHONE || '').trim();
const FULL_NAME = (process.env.FULL_NAME || '').trim();
const PLAN = (process.env.PLAN || 'free').trim().toLowerCase();
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const isDryRun = process.argv.includes('--dry-run');
const STARTING_TENANT_CODE = 2456;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI_MAIN / MONGODB_URI');
  process.exit(1);
}

if (!USER_EMAIL) {
  console.error("❌ Missing USER_EMAIL. Example: USER_EMAIL='legacy@example.com' TENANT_SLUG='legacy-crm' BUSINESS_NAME='Legacy CRM' node scripts/repair-crm-signup-provisioning.js --dry-run");
  process.exit(1);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function sanitizeFolderName(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'crm-user';
}

function resolveStoragePlan(plan) {
  if (plan === 'growth') return 'growth';
  if (plan === 'professional') return 'pro';
  return 'starter';
}

async function generatePermanentTenantId(db) {
  const latest = await db.collection('crm_user_settings').find(
    { permanentTenantId: { $regex: '^[0-9]{7}$' } },
    { projection: { permanentTenantId: 1 } }
  ).sort({ permanentTenantId: -1 }).limit(1).toArray();

  let nextCode = latest[0]?.permanentTenantId ? parseInt(latest[0].permanentTenantId, 10) + 1 : STARTING_TENANT_CODE;
  while (await db.collection('crm_user_settings').findOne({ permanentTenantId: String(nextCode).padStart(7, '0') }, { projection: { _id: 1 } })) {
    nextCode += 1;
  }
  return String(nextCode).padStart(7, '0');
}

function createDefaultSetup(tenantSlug, plan, businessName, fullName, userEmail, phone) {
  const now = new Date();
  return {
    tenantId: '',
    tenantSlug,
    plan,
    business: {
      businessName: businessName || '',
      primaryColor: '#3B82F6',
      adminName: fullName || '',
      adminEmail: userEmail,
      adminPhone: phone || '',
    },
    domain: {
      useCustomDomain: false,
      subdomain: tenantSlug,
    },
    whatsapp: {
      phoneNumberId: '',
      accessToken: '',
      metaAppId: '',
      metaAppSecret: '',
      templates: [],
      isConnected: false,
    },
    leadAds: { enabled: false, isConnected: false },
    payments: { provider: 'none', currency: 'INR', enabledMethods: ['upi', 'card', 'netbanking'] },
    aiCalling: { enabled: false, preferredLanguages: ['en-IN', 'hi-IN'], retellAgents: [], callRecording: true },
    team: {
      members: [],
      invitePending: [],
      roles: [
        { id: 'admin', name: 'Admin', permissions: ['all'], isDefault: false },
        { id: 'manager', name: 'Manager', permissions: ['leads.view', 'leads.edit', 'leads.assign', 'reports.view', 'team.view'], isDefault: false },
        { id: 'agent', name: 'Sales Agent', permissions: ['leads.view', 'leads.edit', 'whatsapp.send'], isDefault: true },
        { id: 'viewer', name: 'Viewer', permissions: ['leads.view', 'reports.view'], isDefault: false },
      ],
    },
    setupProgress: {
      business: { completed: !!businessName, required: true, availableInPlan: true, completedAt: businessName ? now : undefined },
      domain: { completed: !!tenantSlug, required: true, availableInPlan: true, completedAt: tenantSlug ? now : undefined },
      whatsapp: { completed: false, required: plan !== 'free', availableInPlan: plan !== 'free' },
      leadAds: { completed: false, required: false, availableInPlan: ['starter', 'growth', 'professional'].includes(plan) },
      payments: { completed: false, required: false, availableInPlan: ['basic', 'starter', 'growth', 'professional'].includes(plan) },
      aiCalling: { completed: false, required: false, availableInPlan: ['growth', 'professional'].includes(plan) },
      team: { completed: false, required: false, availableInPlan: true },
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
  const now = new Date();

  const adminUser = await db.collection('admin_users').findOne(
    { $or: [{ userId: USER_EMAIL }, { email: USER_EMAIL }] },
    { projection: { userId: 1, email: 1, name: 1, phone: 1, tenantSlug: 1, planId: 1, planName: 1 } }
  );

  if (!adminUser) {
    console.error(`❌ No admin_user found for ${USER_EMAIL}`);
    process.exit(1);
  }

  const existingTenant = await db.collection('tenants').findOne(
    { $or: [{ ownerEmail: adminUser.userId }, { ownerUserId: adminUser.userId }, { slug: adminUser.tenantSlug }] },
    { projection: { slug: 1, name: 1, plan: 1 } }
  );
  const existingCrmTenant = await db.collection('crm_tenants').findOne(
    { $or: [{ ownerEmail: adminUser.userId }, { ownerUserId: adminUser.userId }, { adminEmail: adminUser.userId }, { slug: adminUser.tenantSlug }] },
    { projection: { _id: 1, slug: 1, name: 1, plan: 1 } }
  );

  const existingSettings = await db.collection('crm_user_settings').findOne(
    { userId: adminUser.userId },
    { projection: { permanentTenantId: 1, qrBridgeSecret: 1 } }
  );

  const existingCompartment = await db.collection('user_compartments').findOne(
    { userId: adminUser.userId },
    { projection: { _id: 1, compartmentId: 1, folderName: 1 } }
  );

  const tenantSlug = adminUser.tenantSlug || existingTenant?.slug || existingCrmTenant?.slug || TENANT_SLUG_INPUT || slugify(BUSINESS_NAME || adminUser.name || USER_EMAIL.split('@')[0]);
  const businessName = BUSINESS_NAME || existingTenant?.name || existingCrmTenant?.name || adminUser.name || tenantSlug;
  const fullName = FULL_NAME || adminUser.name || businessName;
  const phone = PHONE || adminUser.phone || '';
  const plan = existingTenant?.plan || existingCrmTenant?.plan || adminUser.planId || PLAN || 'free';
  const folderName = sanitizeFolderName(tenantSlug);

  console.log(`\n🛠️  Repair CRM signup provisioning for ${USER_EMAIL}`);
  console.log(`   tenantSlug=${tenantSlug}`);
  console.log(`   businessName=${businessName}`);
  console.log(`   plan=${plan}`);
  console.log(`   mode=${isDryRun ? 'DRY-RUN' : 'LIVE'}\n`);

  if (!tenantSlug) {
    console.error('❌ Unable to resolve tenantSlug. Provide TENANT_SLUG explicitly.');
    process.exit(1);
  }

  const actions = [];

  if (!adminUser.tenantSlug) {
    actions.push(`Set admin_users.tenantSlug=${tenantSlug}`);
    if (!isDryRun) {
      await db.collection('admin_users').updateOne(
        { _id: adminUser._id },
        { $set: { tenantSlug, updatedAt: now } }
      );
    }
  }

  let tenant = existingTenant;
  if (!tenant) {
    actions.push('Create tenants record');
    if (!isDryRun) {
      await db.collection('tenants').insertOne({
        slug: tenantSlug,
        tenantSlug,
        name: businessName,
        plan,
        ownerEmail: adminUser.userId,
        ownerUserId: adminUser.userId,
        ownerName: fullName,
        ownerPhone: phone,
        status: 'active',
        enabledModules: ['crm'],
        customLimits: {},
        subscription: {
          plan,
          status: plan === 'free' ? 'trial' : 'active',
          startDate: now,
        },
        createdAt: now,
        updatedAt: now,
      });
      tenant = { slug: tenantSlug, name: businessName, plan };
    }
  }

  let crmTenant = existingCrmTenant;
  if (!crmTenant) {
    actions.push('Create crm_tenants record');
    if (!isDryRun) {
      const insert = await db.collection('crm_tenants').insertOne({
        slug: tenantSlug,
        tenantSlug,
        name: businessName,
        ownerEmail: adminUser.userId,
        ownerUserId: adminUser.userId,
        ownerName: fullName,
        ownerPhone: phone,
        adminEmail: adminUser.userId,
        adminUserId: adminUser.userId,
        plan,
        status: 'active',
        branding: { primaryColor: '#3B82F6' },
        subscription: {
          plan,
          status: plan === 'free' ? 'trial' : 'active',
          startDate: now,
        },
        enabledModules: ['crm'],
        createdAt: now,
        updatedAt: now,
      });
      crmTenant = { _id: insert.insertedId, slug: tenantSlug, name: businessName, plan };
    }
  }

  const tenantSetup = await db.collection('tenant_setup').findOne({ tenantSlug }, { projection: { _id: 1 } });
  if (!tenantSetup) {
    actions.push('Create tenant_setup record');
    if (!isDryRun) {
      const setup = createDefaultSetup(tenantSlug, plan, businessName, fullName, adminUser.userId, phone);
      setup.tenantId = crmTenant?._id?.toString() || tenantSlug;
      await db.collection('tenant_setup').insertOne(setup);
    }
  }

  if (!existingSettings) {
    const permanentTenantId = await generatePermanentTenantId(db);
    const qrBridgeSecret = require('crypto').randomBytes(16).toString('hex');
    actions.push(`Create crm_user_settings (permanentTenantId=${permanentTenantId})`);
    if (!isDryRun) {
      await db.collection('crm_user_settings').insertOne({
        userId: adminUser.userId,
        email: adminUser.userId,
        permanentTenantId,
        qrBridgeSecret,
        qrWhatsappEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  } else {
    const settingsSet = {};
    if (!existingSettings.permanentTenantId) {
      settingsSet.permanentTenantId = await generatePermanentTenantId(db);
      actions.push(`Fill crm_user_settings.permanentTenantId=${settingsSet.permanentTenantId}`);
    }
    if (!existingSettings.qrBridgeSecret) {
      settingsSet.qrBridgeSecret = require('crypto').randomBytes(16).toString('hex');
      actions.push('Fill crm_user_settings.qrBridgeSecret');
    }
    if (Object.keys(settingsSet).length > 0 && !isDryRun) {
      await db.collection('crm_user_settings').updateOne(
        { userId: adminUser.userId },
        { $set: { ...settingsSet, updatedAt: now } }
      );
    }
  }

  if (!existingCompartment) {
    const compartmentId = `comp_${require('crypto').randomBytes(8).toString('hex')}`;
    actions.push(`Create user_compartments (folder=${folderName})`);
    if (!isDryRun) {
      await db.collection('user_compartments').insertOne({
        userId: adminUser.userId,
        email: adminUser.userId,
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
          plan: resolveStoragePlan(plan),
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
          plan,
          billing: 'monthly',
          status: plan === 'free' ? 'trial' : 'active',
          startDate: now,
          trialStartDate: now,
          trialEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          trialUsed: false,
        },
        isActive: true,
        lastActivityAt: now,
        metadata: {
          provisionedBy: 'repair-crm-signup-provisioning',
          tenantSlug,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (actions.length === 0) {
    console.log('✅ No repair actions needed.');
  } else {
    actions.forEach((action) => console.log(`${isDryRun ? '🧪' : '✅'} ${action}`));
  }

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error('❌ Repair script crashed');
  console.error(error);
  process.exit(1);
});
