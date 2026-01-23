const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function check() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI_MAIN in .env.local");
    process.exit(1);
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(CRM_DB_NAME);
    const Message = db.model('Message', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_messages' }));
    const WebhookEvent = db.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_webhook_events' }));
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    console.log(`\n--- Meta Status Check: ${new Date().toLocaleString()} ---`);
    
    // 1. Check for ANY activity today
    const outboundToday = await Message.find({ 
      direction: 'outbound', 
      provider: 'meta',
      createdAt: { $gte: today } 
    }).sort({ createdAt: -1 }).lean();

    const inboundToday = await Message.find({ 
      direction: 'inbound', 
      provider: 'meta',
      createdAt: { $gte: today } 
    }).sort({ createdAt: -1 }).lean();

    const rawRawEventsToday = await WebhookEvent.find({
      $or: [
        { type: 'RAW_POST_RECEIVED' },
        { message: 'POST_HEALTH_PING' },
        { message: 'RAW_POST_RECEIVED' },
        { kind: 'verify' }
      ],
      $or: [
        { timestamp: { $gte: today } },
        { receivedAt: { $gte: today } }
      ]
    }).sort({ timestamp: -1, receivedAt: -1 }).limit(10).lean();

    console.log(`Meta Outbound Today: ${outboundToday.length}`);
    console.log(`Meta Inbound Today: ${inboundToday.length}`);
    console.log(`Total Webhook Events Today: ${rawRawEventsToday.length}`);

    if (rawRawEventsToday.length > 0) {
        console.log('\nLatest Webhook Events:');
        rawRawEventsToday.forEach(e => {
            const time = e.timestamp || e.receivedAt;
            const msg = e.message || e.type || 'unknown';
            console.log(`- [${time.toISOString()}] ${msg} | ${JSON.stringify(e.sample || {}).substring(0, 80)}...`);
        });
    }

  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

check();
