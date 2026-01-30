const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Get most recent webhook events regardless of time
  const events = await db.collection('whatsappwebhookevents').find({}).sort({ receivedAt: -1 }).limit(3).toArray();
  console.log('Most recent webhook events:');
  events.forEach(e => {
    console.log('-', e.receivedAt, '|', e.kind, '|', e.message?.substring(0,50));
  });
  
  // Get most recent inbound message regardless of time  
  const msg = await db.collection('whatsappmessages').find({ direction: 'inbound' }).sort({ sentAt: -1 }).limit(1).toArray();
  console.log('\nLast inbound message:');
  if (msg[0]) {
    console.log('Phone:', msg[0].phoneNumber);
    console.log('Time:', msg[0].sentAt);
    console.log('Type:', msg[0].messageType);
    console.log('Media:', msg[0].media ? 'YES' : 'no');
  } else {
    console.log('No inbound messages found');
  }
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
