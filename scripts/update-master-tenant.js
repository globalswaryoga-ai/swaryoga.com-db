/**
 * Update master tenant with proper schema fields
 * Run: node scripts/update-master-tenant.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: 'swaryogaDB' });
  console.log('✅ Connected');

  const result = await mongoose.connection.db.collection('tenants').updateOne(
    { slug: 'swaryoga' },
    {
      $set: {
        tenantSlug: 'swaryoga',
        organizationName: 'Swar Yoga',
        subscriptionTier: 'plan4',
        subscriptionStatus: 'active',
        adminUserId: 'admincrm',
        adminEmail: 'admin@swaryoga.com',
        isActive: true,
        enabledModules: {
          leads: true,
          whatsapp: true,
          aiCalls: true,
          broadcasting: true,
          reports: true,
          community: true,
          templates: true,
          callRecording: true,
        },
        limits: {
          maxLeads: 999999,
          maxUsers: 100,
          storageQuotaMB: 50000,
        },
        usage: {
          leadsCount: 0,
          messagesCount: 0,
          callsCount: 0,
          storageUsedMB: 0,
          teamMembersCount: 1,
        },
      },
    }
  );

  console.log('✅ Updated:', result.modifiedCount, 'document(s)');

  const doc = await mongoose.connection.db.collection('tenants').findOne({ tenantSlug: 'swaryoga' });
  console.log('Tenant:', JSON.stringify(doc, null, 2));

  await mongoose.disconnect();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
