const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Count by provider
  const providers = await db.collection('whatsappmessages').aggregate([
    { $match: { direction: 'outbound' } },
    { $group: { _id: '$provider', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  
  console.log('Outbound messages by provider:');
  providers.forEach(p => console.log(' ', p._id || '(null)', ':', p.count));
  
  // Get most recent 5 outbound
  const msgs = await db.collection('whatsappmessages').find({
    direction: 'outbound'
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  console.log('\nMost recent outbound messages:');
  msgs.forEach(m => {
    console.log('---');
    console.log('Phone:', m.phoneNumber);
    console.log('Provider:', m.provider);
    console.log('Type:', m.messageType);
    console.log('Status:', m.status);
    console.log('Media:', m.media?.url ? m.media.url.substring(0,60)+'...' : 'No');
    console.log('SentAt:', m.sentAt);
  });
  
  // Check for phone 919353633690
  const testMsgs = await db.collection('whatsappmessages').find({
    phoneNumber: { $in: ['919353633690', '9353633690'] }
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  console.log('\n\nMessages for 919353633690:');
  testMsgs.forEach(m => {
    console.log('---');
    console.log('Direction:', m.direction);
    console.log('Provider:', m.provider);
    console.log('Type:', m.messageType);
    console.log('Content:', (m.messageContent || '').substring(0, 60));
    console.log('Media:', m.media?.url ? 'Yes' : 'No');
    console.log('SentAt:', m.sentAt);
  });
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
