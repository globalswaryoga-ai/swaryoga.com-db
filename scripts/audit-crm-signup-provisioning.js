#!/usr/bin/env node
/**
 * Audit CRM signup provisioning across all admin users.
 *
 * Reports which CRM admin users are missing any of the records expected after
 * signup provisioning:
 * - admin_users.tenantSlug
 * - crm_user_settings
 * - permanentTenantId
 * - qrBridgeSecret
 * - user_compartments
 * - tenants
 * - crm_tenants
 * - tenant_setup
 *
 * Usage:
 *   node scripts/audit-crm-signup-provisioning.js
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI_MAIN / MONGODB_URI');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });

  const [admins, settings, compartments, tenants, crmTenants, tenantSetups] = await Promise.all([
    db.collection('admin_users').find(
      { isAdmin: true },
      { projection: { userId: 1, email: 1, name: 1, tenantSlug: 1, planId: 1, planName: 1 } }
    ).toArray(),
    db.collection('crm_user_settings').find({}, { projection: { userId: 1, permanentTenantId: 1, qrBridgeSecret: 1 } }).toArray(),
    db.collection('user_compartments').find({}, { projection: { userId: 1 } }).toArray(),
    db.collection('tenants').find({}, { projection: { slug: 1, ownerEmail: 1, ownerUserId: 1, name: 1, plan: 1 } }).toArray(),
    db.collection('crm_tenants').find({}, { projection: { slug: 1, ownerEmail: 1, ownerUserId: 1, adminEmail: 1, adminUserId: 1, name: 1, plan: 1 } }).toArray(),
    db.collection('tenant_setup').find({}, { projection: { tenantSlug: 1 } }).toArray(),
  ]);

  const settingsMap = new Map(settings.map((doc) => [doc.userId, doc]));
  const compartmentSet = new Set(compartments.map((doc) => doc.userId));
  const tenantByOwner = new Map();
  const crmTenantByOwner = new Map();

  for (const doc of tenants) {
    if (doc.ownerEmail) tenantByOwner.set(doc.ownerEmail, doc.slug);
    if (doc.ownerUserId) tenantByOwner.set(doc.ownerUserId, doc.slug);
  }

  for (const doc of crmTenants) {
    if (doc.ownerEmail) crmTenantByOwner.set(doc.ownerEmail, doc.slug);
    if (doc.ownerUserId) crmTenantByOwner.set(doc.ownerUserId, doc.slug);
    if (doc.adminEmail) crmTenantByOwner.set(doc.adminEmail, doc.slug);
    if (doc.adminUserId) crmTenantByOwner.set(doc.adminUserId, doc.slug);
  }

  const tenantSlugSet = new Set(tenants.map((doc) => doc.slug).filter(Boolean));
  const crmTenantSlugSet = new Set(crmTenants.map((doc) => doc.slug).filter(Boolean));
  const tenantSetupSet = new Set(tenantSetups.map((doc) => doc.tenantSlug).filter(Boolean));

  const rows = admins.filter((admin) => !SUPER_ADMIN_IDS.has(admin.userId || admin.email)).map((admin) => {
    const userId = admin.userId || admin.email;
    const inferredSlug = admin.tenantSlug || tenantByOwner.get(userId) || crmTenantByOwner.get(userId) || '';
    const userSettings = settingsMap.get(userId);
    return {
      userId,
      name: admin.name || '',
      tenantSlug: admin.tenantSlug || '',
      inferredSlug,
      hasSettings: !!userSettings,
      hasPermanentTenantId: !!userSettings?.permanentTenantId,
      hasQrBridgeSecret: !!userSettings?.qrBridgeSecret,
      hasCompartment: compartmentSet.has(userId),
      hasTenant: !!(inferredSlug && tenantSlugSet.has(inferredSlug)),
      hasCrmTenant: !!(inferredSlug && crmTenantSlugSet.has(inferredSlug)),
      hasTenantSetup: !!(inferredSlug && tenantSetupSet.has(inferredSlug)),
    };
  });

  const broken = rows.filter((row) =>
    !row.tenantSlug ||
    !row.hasSettings ||
    !row.hasPermanentTenantId ||
    !row.hasQrBridgeSecret ||
    !row.hasCompartment ||
    !row.hasTenant ||
    !row.hasCrmTenant ||
    !row.hasTenantSetup
  );

  console.log(`\n🔎 CRM signup provisioning audit`);
  console.log(`   total admins: ${rows.length}`);
  console.log(`   users with gaps: ${broken.length}\n`);

  if (broken.length === 0) {
    console.log('✅ No provisioning gaps found.');
    await mongoose.connection.close();
    return;
  }

  for (const row of broken) {
    const gaps = [];
    if (!row.tenantSlug) gaps.push('tenantSlug');
    if (!row.hasSettings) gaps.push('crm_user_settings');
    if (!row.hasPermanentTenantId) gaps.push('permanentTenantId');
    if (!row.hasQrBridgeSecret) gaps.push('qrBridgeSecret');
    if (!row.hasCompartment) gaps.push('user_compartments');
    if (!row.hasTenant) gaps.push('tenants');
    if (!row.hasCrmTenant) gaps.push('crm_tenants');
    if (!row.hasTenantSetup) gaps.push('tenant_setup');

    console.log(`- ${row.userId}`);
    console.log(`  name: ${row.name || '-'}`);
    console.log(`  tenantSlug: ${row.tenantSlug || '-'} | inferred: ${row.inferredSlug || '-'}`);
    console.log(`  gaps: ${gaps.join(', ')}`);
  }

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error('❌ Audit crashed');
  console.error(error);
  process.exit(1);
});
