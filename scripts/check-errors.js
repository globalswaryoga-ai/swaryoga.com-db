const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  console.log('Searching for ERROR events...');
  const errs = await crmDb.collection('whatsapp_webhook_events').find({ kind: 'error' }).sort({ receivedAt: -1 }).limit(5).toArray();
  console.log('Errors Found:', JSON.stringify(errs, null, 2));
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});