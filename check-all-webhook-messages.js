const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  const messageCollection = crmDb.collection('whatsapp_messages');
  
  // Get all inbound messages
  const allMessages = await messageCollection
    .find({ direction: 'inbound' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  if (allMessages.length === 0) {
    console.log('❌ No inbound messages found');
    process.exit(0);
  }
  
  console.log(`✅ Found ${allMessages.length} inbound message(s):\n`);
  
  allMessages.forEach((msg, i) => {
    console.log(`${i + 1}. Phone: ${msg.phoneNumber}`);
    console.log(`   Content: ${msg.messageContent}`);
    console.log(`   Created: ${msg.createdAt}`);
    console.log(`   Message ID: ${msg._id}`);
    console.log('');
  });
  
  console.log('✅ Incoming webhook messages are being SAVED!');
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
