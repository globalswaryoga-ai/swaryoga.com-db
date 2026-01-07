const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  const messageCollection = crmDb.collection('whatsapp_messages');
  
  const recentMessage = await messageCollection
    .findOne({ direction: 'inbound' }, { sort: { createdAt: -1 } });
  
  if (recentMessage) {
    console.log('📋 Raw message document:');
    console.log(JSON.stringify(recentMessage, null, 2));
  } else {
    console.log('❌ No inbound messages found');
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
