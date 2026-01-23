const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const MONGODB_URI = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  
  await mongoose.connect(MONGODB_URI);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
  
  const userPhone = '919309986820';
  const now = new Date();
  const last30mins = new Date(now.getTime() - 30 * 60 * 1000);
  
  console.log(`\n📊 CHECKING INBOUND MESSAGES FOR ${userPhone}\n`);
  console.log(`Time range: ${last30mins.toISOString()} to ${now.toISOString()}\n`);
  
  // Check processed inbound messages
  console.log('--- PROCESSED INBOUND MESSAGES ---');
  const inboundMsgs = await crmDb.collection('whatsapp_messages').find({
    phoneNumber: userPhone,
    direction: 'inbound',
    createdAt: { $gte: last30mins }
  }).sort({ createdAt: -1 }).toArray();
  
  console.log(`✅ Count: ${inboundMsgs.length} messages`);
  if (inboundMsgs.length > 0) {
    inboundMsgs.forEach((msg, i) => {
      console.log(`[${i+1}] ${msg.createdAt.toISOString()} | Status: ${msg.status} | Content: "${msg.messageContent?.substring(0, 50)}..."`);
    });
  } else {
    console.log('❌ No inbound messages received in last 30 minutes');
  }
  
  // Check raw webhook events
  console.log('\n--- RAW WEBHOOK EVENTS ---');
  const webhookEvents = await crmDb.collection('whatsapp_webhook_events').find({
    phoneNumber: userPhone,
    kind: 'inbound_message',
    receivedAt: { $gte: last30mins }
  }).sort({ receivedAt: -1 }).toArray();
  
  console.log(`✅ Count: ${webhookEvents.length} webhook hits`);
  if (webhookEvents.length > 0) {
    webhookEvents.forEach((ev, i) => {
      console.log(`[${i+1}] ${ev.receivedAt.toISOString()} | WA ID: ${ev.waMessageId} | Sample: ${ev.sample?.preview?.substring(0, 50) || 'N/A'}`);
    });
  } else {
    console.log('❌ No webhook events received in last 30 minutes');
  }
  
  // Summary
  console.log('\n--- SUMMARY ---');
  if (inboundMsgs.length === 0 && webhookEvents.length === 0) {
    console.log('⚠️  NO MESSAGES RECEIVED AT ALL');
    console.log('   → Meta is NOT sending webhooks for this number');
    console.log('   → Check if number is a Verified Tester in Meta Dashboard');
    console.log('   → Verify webhook URL is correct in Meta settings');
  } else if (webhookEvents.length > inboundMsgs.length) {
    console.log(`✅ ${webhookEvents.length} messages hit webhook`);
    console.log(`⚠️  Only ${inboundMsgs.length} processed to database`);
    console.log('   → Processing logic may be failing - check server logs');
  } else if (inboundMsgs.length === webhookEvents.length) {
    console.log(`✅ ALL ${inboundMsgs.length} messages received and processed successfully`);
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});