const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const WebhookEvent = db.model('WebhookEvent', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_webhook_events' }));
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const events = await WebhookEvent.find({ 
    $or: [
      { createdAt: { $gte: oneHourAgo } },
      { timestamp: { $gte: oneHourAgo } },
      { receivedAt: { $gte: oneHourAgo } }
    ]
  }).sort({ receivedAt: -1, timestamp: -1 }).lean();
  
  console.log('--- ALL WEBHOOK EVENTS (LAST 60 MINS) ---');
  console.log('Count:', events.length);
  events.forEach(e => {
    console.log(`[${e.receivedAt || e.timestamp || e.createdAt}] Kind: ${e.kind} | Msg: ${e.message}`);
    if (e.sample && e.sample.rawBodyPreview) {
        console.log(`Payload: ${e.sample.rawBodyPreview.substring(0, 150)}...`);
    } else if (e.sample) {
        console.log(`Sample: ${JSON.stringify(e.sample).substring(0, 150)}...`);
    }
  });
  
  process.exit(0);
}
check();
