const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function testProxy() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log(`✅ Connected to ${dbName}`);

    // Import the proxy models
    const { WhatsAppMessage } = require('./lib/schemas/enterpriseSchemas');

    console.log('\n📝 Testing model proxy...');
    console.log('WhatsAppMessage type:', typeof WhatsAppMessage);
    console.log('WhatsAppMessage.create type:', typeof WhatsAppMessage.create);

    // Try to create a test message
    const testMsg = await WhatsAppMessage.create({
      phoneNumber: '+919779006820',
      messageContent: 'Test message from proxy',
      direction: 'inbound',
      status: 'delivered',
    });

    console.log('✅ Message created:', testMsg._id);
    console.log('Message content:', testMsg.messageContent);

    // Verify it's in database
    const found = await WhatsAppMessage.findById(testMsg._id);
    console.log('✅ Found in DB:', found.messageContent);

    await mongoose.disconnect();
    console.log('\n✅ Proxy test passed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testProxy();
