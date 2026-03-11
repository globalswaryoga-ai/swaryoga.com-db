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
    await mongoose.connect(MONGODB_URI);
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
    const collection = crmDb.collection('crm_user_settings');

    const users = await collection.find({}).toArray();
    
    console.log('\nUser Bridge Configuration Status:\n');
    
    users.forEach((u, i) => {
      const permanentId = u.permanentTenantId || 'MISSING';
      const hasSecret = u.qrBridgeSecret ? '✅' : '❌';
      const url = u.qrBridgeUrl || 'none';
      
      console.log(`[${i+1}] User: ${u.userId}`);
      console.log(`    Permanent ID: ${permanentId}`);
      console.log(`    Bridge URL: ${url}`);
      console.log(`    Bridge Secret: ${hasSecret}\n`);
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
