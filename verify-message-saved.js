const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function verify() {
  try {
    console.log('🔗 Connecting to MongoDB:', MONGODB_URI?.substring(0, 50) + '...');
    await mongoose.connect(MONGODB_URI);
    
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
    const messageCollection = crmDb.collection('whatsapp_messages');
    
    console.log('\n📊 Checking messages in last 5 minutes...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentMessages = await messageCollection
      .find({ createdAt: { $gte: fiveMinutesAgo } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentMessages.length === 0) {
      console.log('❌ No recent messages found!');
    } else {
      console.log(`✅ Found ${recentMessages.length} recent message(s):`);
      recentMessages.forEach((msg, i) => {
        console.log(`\n${i + 1}. From: ${msg.phoneNumber}`);
        console.log(`   Body: ${msg.body}`);
        console.log(`   ID: ${msg.waMessageId}`);
        console.log(`   Created: ${msg.createdAt}`);
        console.log(`   Direction: ${msg.direction}`);
      });
    }
    
    console.log('\n✅ Verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
