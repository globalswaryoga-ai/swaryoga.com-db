const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  const messageCollection = crmDb.collection('whatsapp_messages');
  
  // Get the most recent inbound message (within last 2 minutes)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentMessage = await messageCollection.findOne(
    { direction: 'inbound', createdAt: { $gte: twoMinutesAgo } },
    { sort: { createdAt: -1 } }
  );
  
  if (recentMessage) {
    console.log('✅ WEBHOOK MESSAGE RECEIVED AND SAVED!');
    console.log('\n📋 Message Details:');
    console.log('  From:', recentMessage.phoneNumber);
    console.log('  Content:', recentMessage.messageContent);
    console.log('  Type:', recentMessage.messageType);
    console.log('  Status:', recentMessage.status);
    console.log('  Created:', recentMessage.createdAt);
    console.log('  Message ID:', recentMessage._id);
    console.log('\n✅ Incoming message webhook is WORKING!');
  } else {
    console.log('❌ No recent inbound messages found in last 2 minutes');
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
