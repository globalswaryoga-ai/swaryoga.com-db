const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  const messageCollection = crmDb.collection('whatsapp_messages');
  
  // Get all messages including recent ones
  const allMessages = await messageCollection
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  
  console.log(`✅ Total messages in collection: ${allMessages.length}`);
  
  allMessages.forEach((msg, i) => {
    console.log(`\n${i + 1}. Phone: ${msg.phoneNumber}`);
    console.log(`   Content: ${(msg.messageContent || msg.text || 'N/A').substring(0, 80)}`);
    console.log(`   Direction: ${msg.direction || 'N/A'}`);
    console.log(`   Created: ${msg.createdAt}`);
    console.log(`   ID: ${msg._id}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
