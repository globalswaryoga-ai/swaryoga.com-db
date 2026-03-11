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
    const CRMUserSettingsCollection = crmDb.collection('crm_user_settings');

    console.log('🔄 Resetting permanent tenant IDs...');
    const result = await CRMUserSettingsCollection.updateMany(
      {},
      { $unset: { permanentTenantId: 1 } }
    );

    console.log(`✅ Reset ${result.modifiedCount} users`);
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
