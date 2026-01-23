const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(CRM_DB_NAME);
    const Message = db.model('Message', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_messages' }));
    const WebhookEvent = db.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_webhook_events' }));
    
    const targetPhone = '919309986820';
    console.log(`\n--- Searching for: ${targetPhone} ---`);

    // 1. Check Messages
    const messages = await Message.find({ 
      phoneNumber: targetPhone,
      direction: 'inbound'
    }).sort({ createdAt: -1 }).limit(5).lean();

    console.log(`Recent Inbound Messages Found: ${messages.length}`);
    messages.forEach(m => {
      console.log(`- [${m.createdAt.toISOString()}] ${m.messageContent} (ID: ${m.waMessageId})`);
    });

    // 2. Check Raw Webhook Events
    const events = await WebhookEvent.find({
      $or: [
        { phoneNumber: targetPhone },
        { message: new RegExp(targetPhone) },
        { 'sample.rawBodyPreview': new RegExp(targetPhone) }
      ]
    }).sort({ timestamp: -1, receivedAt: -1 }).limit(5).lean();

    console.log(`\nWhatsApp Webhook Events Found: ${events.length}`);
    events.forEach(e => {
        const time = e.timestamp || e.receivedAt;
        console.log(`- [${time.toISOString()}] ${e.message}`);
        if(e.sample?.rawBodyPreview) {
            console.log(`  Preview: ${e.sample.rawBodyPreview.substring(0, 100)}...`);
        }
    });

  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

check();
