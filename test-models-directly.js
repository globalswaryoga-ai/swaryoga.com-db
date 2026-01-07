const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
    await mongoose.connect(uri);
    console.log('✅ Connected');
    
    // Import models
    const { Lead, WhatsAppMessage } = await import('./lib/schemas/enterpriseSchemas.js');
    
    console.log('\n📋 Testing Lead model...');
    console.log('typeof Lead:', typeof Lead);
    console.log('Lead.find:', typeof Lead.find);
    
    // Try to use the model
    console.log('\n⏳ Testing Lead.findOne...');
    const lead = await Lead.findOne({ phoneNumber: '919309986820' });
    console.log('✅ findOne executed, result:', lead ? 'found' : 'not found');
    
    console.log('\n📋 Testing WhatsAppMessage model...');
    console.log('typeof WhatsAppMessage:', typeof WhatsAppMessage);
    console.log('WhatsAppMessage.updateOne:', typeof WhatsAppMessage.updateOne);
    
    // Try to create a test message
    console.log('\n⏳ Testing WhatsAppMessage.create...');
    const msg = await WhatsAppMessage.create({
      phoneNumber: '919309986820',
      direction: 'inbound',
      messageType: 'text',
      messageContent: 'Test message from Node.js script',
      status: 'delivered',
    });
    console.log('✅ Message created:', msg._id);
    
    // Verify it was saved
    const found = await WhatsAppMessage.findOne({ _id: msg._id });
    console.log('✅ Message found in DB:', found ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
})();
