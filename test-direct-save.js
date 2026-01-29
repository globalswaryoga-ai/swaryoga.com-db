// Test script to directly save a message to CRM database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testSave() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected!');
  
  // Get CRM database
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  console.log('Using CRM database:', CRM_DB_NAME);
  
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
  
  // Define schema inline
  const WhatsAppMessageSchema = new mongoose.Schema({
    phoneNumber: String,
    direction: String,
    messageContent: String,
    messageType: String,
    media: { kind: String, url: String },
    status: String,
    provider: String,
    sentAt: Date,
  }, { timestamps: true });
  
  const WhatsAppMessage = crmDb.models['WhatsAppMessage'] || crmDb.model('WhatsAppMessage', WhatsAppMessageSchema);
  
  // Create test message with image
  const testMsg = {
    phoneNumber: '919353633690',
    direction: 'outbound',
    messageContent: 'Test image message - ' + new Date().toISOString(),
    messageType: 'media',
    media: { 
      kind: 'image', 
      url: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/test-image.jpg' 
    },
    status: 'sent',
    provider: 'whatsapp_web_bridge',
    sentAt: new Date(),
  };
  
  console.log('\nSaving message:', testMsg);
  
  const saved = await WhatsAppMessage.create(testMsg);
  console.log('\n✅ Message saved with ID:', saved._id.toString());
  
  // Verify it's in the database
  const found = await WhatsAppMessage.findById(saved._id);
  console.log('\n✅ Verified in database:');
  console.log('  Phone:', found.phoneNumber);
  console.log('  Direction:', found.direction);
  console.log('  Media URL:', found.media?.url);
  console.log('  Provider:', found.provider);
  
  // Count total messages for this phone
  const count = await WhatsAppMessage.countDocuments({ phoneNumber: '919353633690' });
  console.log('\nTotal messages for 919353633690:', count);
  
  process.exit(0);
}

testSave().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
