const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  // Search for messages from this phone number
  const phoneNumber = '919309986820'; // Add country code
  
  const allMessages = await crmDb
    .collection('whatsapp_messages')
    .find({ phoneNumber: phoneNumber })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  
  console.log(`\n📱 Messages from ${phoneNumber}:`);
  console.log(`Found: ${allMessages.length} message(s)\n`);
  
  if (allMessages.length === 0) {
    console.log('❌ No messages found from this number');
    
    // Check what phone numbers we have
    const allPhones = await crmDb
      .collection('whatsapp_messages')
      .aggregate([
        { $group: { _id: '$phoneNumber', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
      .toArray();
    
    console.log('\n📊 All phone numbers in database:');
    allPhones.forEach(p => {
      console.log(`   ${p._id}: ${p.count} message(s)`);
    });
  } else {
    allMessages.forEach((msg, i) => {
      console.log(`${i + 1}. Content: ${msg.messageContent || msg.text || 'N/A'}`);
      console.log(`   Direction: ${msg.direction}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log(`   Message ID: ${msg._id}\n`);
    });
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
