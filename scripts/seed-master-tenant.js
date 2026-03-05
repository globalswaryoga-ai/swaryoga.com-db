/**
 * Seed Master Tenant
 *
 * Run ONCE to create the "swaryoga" master tenant document in the
 * tenants collection. This maps the existing swaryoga_admin_crm database
 * to a tenant record, enabling backward-compatible multi-tenant operation.
 *
 * Usage:
 *   node scripts/seed-master-tenant.js
 *
 * Requires:
 *   - MONGODB_URI_MAIN (or MONGODB_URI)
 *   - MONGODB_MAIN_DB_NAME (defaults to swaryogaDB)
 *   - MONGODB_CRM_DB_NAME (defaults to swaryoga_admin_crm)
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: MAIN_DB_NAME });
  console.log('✅ Connected to', MAIN_DB_NAME);

  const db = mongoose.connection.db;
  const tenantsCol = db.collection('tenants');

  // Check if master tenant already exists
  const existing = await tenantsCol.findOne({ slug: 'swaryoga' });
  if (existing) {
    console.log('✅ Master tenant already exists:');
    console.log(JSON.stringify(existing, null, 2));
    await mongoose.disconnect();
    return;
  }

  // Count existing leads in CRM DB for initial usage snapshot
  let leadCount = 0;
  try {
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
    leadCount = await crmDb.collection('leads').countDocuments();
    console.log(`📊 Found ${leadCount} existing leads in ${CRM_DB_NAME}`);
  } catch {
    console.warn('⚠️  Could not count leads in CRM DB (may not exist yet)');
  }

  const masterTenant = {
    slug: 'swaryoga',
    name: 'Swar Yoga',
    ownerEmail: 'admin@swaryoga.com',
    ownerUserId: 'admincrm',
    plan: 'enterprise',
    enabledModules: [
      'crm', 'whatsapp', 'voice_ai', 'payments', 'certificates',
      'life_planner', 'workshops', 'broadcasts', 'chatbot',
      'meta_forms', 'tally', 'community', 'analytics',
      'custom_domain', 'api_access',
    ],
    dbName: CRM_DB_NAME,
    subdomain: 'swaryoga',
    status: 'active',
    currentLeadCount: leadCount,
    currentUserCount: 1,
    currentStorageMB: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await tenantsCol.insertOne(masterTenant);
  console.log('✅ Master tenant created:', result.insertedId);
  console.log(JSON.stringify(masterTenant, null, 2));

  // Create indexes
  await tenantsCol.createIndex({ slug: 1 }, { unique: true });
  await tenantsCol.createIndex({ subdomain: 1 }, { unique: true, sparse: true });
  await tenantsCol.createIndex({ customDomain: 1 }, { unique: true, sparse: true });
  await tenantsCol.createIndex({ ownerEmail: 1 });
  await tenantsCol.createIndex({ status: 1, plan: 1 });
  console.log('✅ Indexes created on tenants collection');

  await mongoose.disconnect();
  console.log('\n🎉 Master tenant seeded successfully!');
  console.log('You can now use multi-tenant features. The existing CRM data');
  console.log(`is mapped to the "${CRM_DB_NAME}" database under the "swaryoga" tenant.`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
