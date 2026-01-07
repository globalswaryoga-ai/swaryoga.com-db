const mongoose = require('mongoose');
require('dotenv').config();

async function testWebhook() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  // Define schema inline to test
  const WhatsAppMessageSchema = new mongoose.Schema(
    {
      leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false, index: true },
      phoneNumber: { type: String, required: true, index: true },
      direction: {
        type: String,
        enum: ['outbound', 'inbound'],
        default: 'outbound',
        index: true,
      },
      messageContent: String,
      messageType: {
        type: String,
        enum: ['text', 'template', 'media', 'interactive'],
        default: 'text',
      },
      status: {
        type: String,
        enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
        default: 'queued',
        index: true,
      },
      waMessageId: String,
      backgroundColor: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#000000' },
      sentAt: { type: Date, default: Date.now },
      deliveredAt: Date,
      metadata: mongoose.Schema.Types.Mixed,
    },
    { timestamps: true, collection: 'whatsapp_messages' }
  );

  const WhatsAppMessage = crmDb.model('WhatsAppMessage', WhatsAppMessageSchema);
  
  console.log('✅ Schema defined');
  console.log('📝 Creating test message...');
  
  const testMessage = await WhatsAppMessage.create({
    phoneNumber: '919779006820',
    direction: 'inbound',
    messageType: 'text',
    messageContent: 'TEST MESSAGE ' + new Date().toISOString(),
    status: 'delivered',
    deliveredAt: new Date(),
    sentAt: new Date(),
    backgroundColor: '#22c55e',
    textColor: '#ffffff',
    metadata: {
      webhook: {
        messageId: 'test.direct.' + Date.now(),
        timestamp: Math.floor(Date.now() / 1000),
        rawType: 'text',
      },
    },
  });
  
  console.log('✅ Message created!');
  console.log('📋 Message ID:', testMessage._id);
  console.log('📋 Content:', testMessage.messageContent);
  
  // Verify it was saved
  const found = await WhatsAppMessage.findById(testMessage._id);
  console.log('✅ Message retrieved:', found ? 'YES' : 'NO');
  console.log('   Content:', found?.messageContent);
  
  await mongoose.disconnect();
  console.log('✅ Done!');
}

testWebhook().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
