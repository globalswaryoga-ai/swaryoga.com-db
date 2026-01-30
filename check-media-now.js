const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  console.log('=== MEDIA MESSAGES (last 24 hours) ===');
  const msgs = await db.collection('whatsappmessages').find({
    messageType: 'media',
    sentAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
  }).sort({ sentAt: -1 }).limit(10).toArray();
  
  console.log('Found:', msgs.length, 'media messages');
  msgs.forEach(m => {
    console.log('---');
    console.log('Phone:', m.phoneNumber);
    console.log('Direction:', m.direction);
    console.log('Media:', m.media ? JSON.stringify(m.media) : 'NONE');
    console.log('Time:', m.sentAt);
  });
  
  console.log('\n=== ALL INBOUND (last 12 hours) ===');
  const inbound = await db.collection('whatsappmessages').find({
    direction: 'inbound',
    sentAt: { $gte: new Date(Date.now() - 12*60*60*1000) }
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  console.log('Found:', inbound.length, 'inbound');
  inbound.forEach(m => {
    console.log('-', m.phoneNumber, '|', m.messageType, '|', m.messageContent?.substring(0,30));
  });
  
  console.log('\n=== WEBHOOK EVENTS (last 6 hours) ===');
  const events = await db.collection('whatsappwebhookevents').find({
    receivedAt: { $gte: new Date(Date.now() - 6*60*60*1000) }
  }).sort({ receivedAt: -1 }).limit(5).toArray();
  
  console.log('Found:', events.length, 'webhook events');
  events.forEach(e => {
    console.log('-', e.kind, '|', e.message?.substring(0,40), '|', e.receivedAt);
  });
  
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
