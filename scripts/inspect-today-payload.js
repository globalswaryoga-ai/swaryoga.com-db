
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = 'swaryoga_admin_crm';
  await mongoose.connect(uri, { dbName });
  const coll = mongoose.connection.collection('whatsapp_webhook_events');
  const events = await coll.find({ 
    message: 'RAW_POST_RECEIVED',
    receivedAt: { $gte: new Date('2026-01-09T00:00:00Z') }
  }).sort({ _id: -1 }).limit(10).toArray();
  console.log(JSON.stringify(events, null, 2));
  await mongoose.disconnect();
}
run();
