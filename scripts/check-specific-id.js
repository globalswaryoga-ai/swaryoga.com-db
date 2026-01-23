const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  console.log('Searching for message ABGGFlA5Fpa...');
  const msg = await crmDb.collection('whatsapp_messages').findOne({ waMessageId: 'ABGGFlA5Fpa' });
  console.log('Message:', JSON.stringify(msg, null, 2));
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});