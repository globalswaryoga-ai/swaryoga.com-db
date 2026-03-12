#!/usr/bin/env node
/**
 * Verify CRM signup provisioning for a specific tenant email.
 *
 * Checks the records created by /api/crm-site/signup:
 * - admin_users
 * - tenants
 * - crm_user_settings
 * - user_compartments
 * - crm_tenants
 * - tenant_setup
 *
 * Usage:
 *   USER_EMAIL='newuser@example.com' node scripts/verify-crm-signup-provisioning.js
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const USER_EMAIL = (process.env.USER_EMAIL || '').trim().toLowerCase();
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI_MAIN / MONGODB_URI');
  process.exit(1);
}

if (!USER_EMAIL) {
  console.error("❌ Missing USER_EMAIL. Example: USER_EMAIL='newuser@example.com' node scripts/verify-crm-signup-provisioning.js");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });

  const adminUser = await db.collection('admin_users').findOne(
    { $or: [{ userId: USER_EMAIL }, { email: USER_EMAIL }] },
    { projection: { userId: 1, email: 1, tenantSlug: 1, planId: 1, planName: 1 } }
  );

  if (!adminUser) {
    console.error(`❌ No admin_user found for ${USER_EMAIL}`);
    process.exit(1);
  }

  const tenantFallback = await Promise.all([
    db.collection('tenants').findOne(
      { $or: [{ ownerEmail: adminUser.userId }, { ownerUserId: adminUser.userId }] },
      { projection: { slug: 1 } }
    ),
    db.collection('crm_tenants').findOne(
      { $or: [{ ownerEmail: adminUser.userId }, { ownerUserId: adminUser.userId }, { adminEmail: adminUser.userId }, { adminUserId: adminUser.userId }] },
      { projection: { slug: 1 } }
    ),
  ]);

  const tenantSlug = adminUser.tenantSlug || tenantFallback[0]?.slug || tenantFallback[1]?.slug;

  const [tenant, settings, compartment, crmTenant, tenantSetup] = await Promise.all([
    db.collection('tenants').findOne({ slug: tenantSlug }, { projection: { slug: 1, plan: 1, ownerEmail: 1 } }),
    db.collection('crm_user_settings').findOne({ userId: adminUser.userId }, { projection: { permanentTenantId: 1, qrBridgeSecret: 1 } }),
    db.collection('user_compartments').findOne({ userId: adminUser.userId }, { projection: { compartmentId: 1, folderName: 1, 'setup.isComplete': 1 } }),
    db.collection('crm_tenants').findOne({ slug: tenantSlug }, { projection: { slug: 1, plan: 1, ownerEmail: 1 } }),
    db.collection('tenant_setup').findOne({ tenantSlug }, { projection: { tenantSlug: 1, tenantId: 1, plan: 1, 'business.businessName': 1, 'domain.subdomain': 1 } }),
  ]);

  const checks = [
    {
      label: 'admin_users',
      ok: !!adminUser,
      details: adminUser ? `${adminUser.userId} · slug=${tenantSlug || 'missing'}` : 'missing',
    },
    {
      label: 'tenants',
      ok: !!tenant,
      details: tenant ? `${tenant.slug} · plan=${tenant.plan}` : 'missing',
    },
    {
      label: 'crm_user_settings',
      ok: !!settings,
      details: settings
        ? `permanentTenantId=${settings.permanentTenantId || 'missing'} · qrBridgeSecret=${settings.qrBridgeSecret ? 'present' : 'missing'}`
        : 'missing',
    },
    {
      label: 'user_compartments',
      ok: !!compartment,
      details: compartment
        ? `compartmentId=${compartment.compartmentId} · folder=${compartment.folderName} · complete=${compartment.setup?.isComplete ? 'yes' : 'no'}`
        : 'missing',
    },
    {
      label: 'crm_tenants',
      ok: !!crmTenant,
      details: crmTenant ? `${crmTenant.slug} · plan=${crmTenant.plan}` : 'missing',
    },
    {
      label: 'tenant_setup',
      ok: !!tenantSetup,
      details: tenantSetup
        ? `tenantId=${tenantSetup.tenantId} · business=${tenantSetup.business?.businessName || '-'} · subdomain=${tenantSetup.domain?.subdomain || '-'}`
        : 'missing',
    },
  ];

  console.log(`\n🔎 CRM signup provisioning verification for ${USER_EMAIL}`);
  console.log(`   tenantSlug=${tenantSlug}\n`);

  let failed = 0;
  for (const check of checks) {
    if (!check.ok) failed += 1;
    console.log(`${check.ok ? '✅' : '❌'} ${check.label.padEnd(18)} ${check.details}`);
  }

  if (settings && !settings.permanentTenantId) {
    failed += 1;
    console.log('❌ permanentTenantId missing inside crm_user_settings');
  }
  if (settings && !settings.qrBridgeSecret) {
    failed += 1;
    console.log('❌ qrBridgeSecret missing inside crm_user_settings');
  }

  console.log(`\n${failed === 0 ? '✅ All signup provisioning records look good.' : `❌ Found ${failed} provisioning issue(s).`}`);

  await mongoose.connection.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Verification crashed');
  console.error(error);
  process.exit(1);
});
