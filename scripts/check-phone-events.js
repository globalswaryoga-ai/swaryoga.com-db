const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  console.log('Searching for raw events from 919309986820...');
  const evs = await crmDb.collection('whatsapp_webhook_events').find({ phoneNumber: '919309986820' }).sort({ receivedAt: -1 }).limit(10).toArray();
  console.log('Events Found:', JSON.stringify(evs, null, 2));
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});