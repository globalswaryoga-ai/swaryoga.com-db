const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testSave() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  console.log('Connected!');
  
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  console.log('Using CRM DB:', CRM_DB_NAME);
  
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
  
  // Define a simple schema
  const msgSchema = new mongoose.Schema({
    phoneNumber: String,
    direction: String,
    messageContent: String,
    messageType: String,
    media: Object,
    status: String,
    provider: String,
    sentAt: Date
  }, { strict: false });
  
  const WhatsAppMessage = crmDb.models['WhatsAppMessage'] || crmDb.model('WhatsAppMessage', msgSchema);
  
  // Create a test message
  const testMsg = await WhatsAppMessage.create({
    phoneNumber: '919353633690',
    direction: 'outbound',
    messageContent: 'Test image message ' + new Date().toISOString(),
    messageType: 'media',
    media: { kind: 'image', url: 'https://example.com/test.jpg' },
    status: 'sent',
    provider: 'whatsapp_web_bridge',
    sentAt: new Date()
  });
  
  console.log('✅ Message saved!');
  console.log('ID:', testMsg._id.toString());
  console.log('Phone:', testMsg.phoneNumber);
  console.log('Media:', testMsg.media);
  
  // Verify it's in the correct DB
  const found = await crmDb.collection('whatsappmessages').findOne({ _id: testMsg._id });
  console.log('\n✅ Verified in CRM DB:', found ? 'YES' : 'NO');
  
  process.exit(0);
}

testSave().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
