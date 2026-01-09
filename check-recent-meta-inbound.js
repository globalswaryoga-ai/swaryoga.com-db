const mongoose = require('mongoose');

// Assuming the connection string is in .env.local
require('dotenv').config({ path: '.env.local' });

async function checkMessages() {
  try {
    const mongoUri = process.env.MONGODB_URI_MAIN || 'mongodb://localhost:27017/swaryogaDB';
    // Instructions say CRM data is in swaryoga_admin_crm
    const crmUri = mongoUri.includes('swaryogaDB') ? mongoUri.replace('swaryogaDB', 'swaryoga_admin_crm') : mongoUri;
    
    await mongoose.connect(crmUri);
    console.log('✅ Connected to MongoDB (CRM DB):', crmUri);

    // Define a minimal schema for WhatsAppMessage
    const MessageSchema = new mongoose.Schema({}, { strict: false, collection: 'whatsapp_messages' });
    const WhatsAppMessage = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', MessageSchema);

    console.log('\n--- Latest 10 Outbound Messages (Today) ---');
    const recentOutbound = await WhatsAppMessage.find({ 
      direction: 'outbound',
      createdAt: { $gte: startOfToday }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    if (recentOutbound.length === 0) {
      console.log('❌ No outbound messages found from today.');
    } else {
      recentOutbound.forEach((m, i) => {
        console.log(`${i + 1}. [${m.createdAt}] Status: ${m.status} | To: ${m.phoneNumber} | Body: ${m.messageContent}`);
      });
    }

    // Also check webhook events
    const EventSchema = new mongoose.Schema({}, { strict: false, collection: 'whatsapp_webhook_events' });
    const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', EventSchema);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    console.log('\n--- Webhook Events from Today ---');
    const todayEvents = await WebhookEvent.find({ 
      createdAt: { $gte: startOfToday }
    })
    .sort({ createdAt: -1 })
    .lean();

    if (todayEvents.length === 0) {
      console.log('❌ No webhook events found from today.');
    } else {
      todayEvents.forEach((e, i) => {
        console.log(`${i + 1}. [${e.createdAt}] Kind: ${e.kind} | Phone: ${e.phoneNumber} | Msg: ${e.message}`);
      });
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkMessages();
