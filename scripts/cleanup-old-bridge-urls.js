/**
 * Cleanup: Remove old UUID bridge URLs and ensure users ONLY use permanentTenantId
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
    const collection = crmDb.collection('crm_user_settings');

    console.log('🧹 Removing old UUID-based bridge URLs...');
    
    // Remove old qrBridgeUrl entries that contain UUID patterns
    const result = await collection.updateMany(
      { qrBridgeUrl: { $regex: '/tenant/[a-f0-9-]{36}' } },  // Match UUID paths
      { $unset: { qrBridgeUrl: 1 } }
    );

    console.log(`✅ Removed old UUID URLs from ${result.modifiedCount} users`);
    
    // Verify all users have permanentTenantId
    const noPermIdCount = await collection.countDocuments({ permanentTenantId: { $exists: false } });
    if (noPermIdCount > 0) {
      console.warn(`⚠️  ${noPermIdCount} users still missing permanentTenantId!`);
    } else {
      console.log('✅ All users have permanentTenantId');
    }

    // Show sample users
    console.log('\n📋 Sample users (first 3):');
    const samples = await collection.find({}).limit(3).toArray();
    samples.forEach((u, i) => {
      console.log(`  [${i+1}] ${u.userId}`);
      console.log(`      - Permanent ID: ${u.permanentTenantId}`);
      console.log(`      - Old URL: ${u.qrBridgeUrl || 'REMOVED'}\n`);
    });

    await mongoose.connection.close();
    console.log('✅ Cleanup complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
