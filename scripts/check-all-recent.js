const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  const targetPhone = '919779006820';
  const last1hour = new Date(Date.now() - 60 * 60 * 1000);
  
  console.log(`\n📊 CHECKING ALL MESSAGES SINCE 3:47 AM\n`);
  console.log(`Target: ${targetPhone}\n`);
  
  // Check processed inbound messages
  console.log('--- INBOUND MESSAGES IN DATABASE ---');
  const inboundMsgs = await crmDb.collection('whatsapp_messages').find({
    phoneNumber: targetPhone,
    direction: 'inbound',
    createdAt: { $gte: last1hour }
  }).sort({ createdAt: -1 }).toArray();
  
  console.log(`Count: ${inboundMsgs.length}`);
  inboundMsgs.forEach((msg, i) => {
    console.log(`[${i+1}] ${msg.createdAt.toISOString()} | "${msg.messageContent}"`);
  });
  
  // Check raw webhook events
  console.log('\n--- RAW WEBHOOK EVENTS FROM META ---');
  const webhookEvents = await crmDb.collection('whatsapp_webhook_events').find({
    phoneNumber: targetPhone,
    kind: 'inbound_message',
    receivedAt: { $gte: last1hour }
  }).sort({ receivedAt: -1 }).toArray();
  
  console.log(`Count: ${webhookEvents.length}`);
  webhookEvents.forEach((ev, i) => {
    console.log(`[${i+1}] ${ev.receivedAt.toISOString()} | ID: ${ev.waMessageId} | "${ev.sample?.preview}"`);
  });
  
  // Check ALL webhook events (any kind)
  console.log('\n--- ALL WEBHOOK EVENTS (ANY TYPE) ---');
  const allEvents = await crmDb.collection('whatsapp_webhook_events').find({
    phoneNumber: targetPhone,
    receivedAt: { $gte: last1hour }
  }).sort({ receivedAt: -1 }).toArray();
  
  console.log(`Count: ${allEvents.length}`);
  allEvents.forEach((ev, i) => {
    console.log(`[${i+1}] ${ev.kind} | ${ev.receivedAt.toISOString()} | ${ev.message || ev.sample?.preview || 'N/A'}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});