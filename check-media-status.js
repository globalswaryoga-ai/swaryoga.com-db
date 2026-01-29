const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  console.log('=== Media Messages Check ===\n');
  
  // Count all media messages
  const mediaCount = await db.collection('whatsappmessages').countDocuments({
    messageType: 'media'
  });
  console.log('Total media messages:', mediaCount);
  
  // Recent media messages
  const media = await db.collection('whatsappmessages').find({
    messageType: 'media'
  }).sort({_id: -1}).limit(5).toArray();
  
  console.log('\nRecent media messages:');
  media.forEach(m => {
    console.log('---');
    console.log('Phone:', m.phoneNumber);
    console.log('Direction:', m.direction);
    console.log('Media Kind:', m.media?.kind || 'UNKNOWN');
    console.log('Media URL:', m.media?.url ? m.media.url.substring(0, 60) + '...' : 'NONE');
    console.log('Date:', m.sentAt || m.createdAt);
  });
  
  // Check recent inbound (to see if images are coming from users)
  console.log('\n=== Recent Inbound (last 10) ===');
  const inbound = await db.collection('whatsappmessages').find({
    direction: 'inbound'
  }).sort({_id: -1}).limit(10).toArray();
  
  const withMedia = inbound.filter(m => m.media?.url);
  console.log('Inbound with media:', withMedia.length, 'of', inbound.length);
  
  inbound.slice(0, 5).forEach(m => {
    console.log('-', m.phoneNumber, '|', m.messageType, '| Media:', m.media?.kind || 'no');
  });
  
  // Check webhook events
  console.log('\n=== Recent Webhook Events ===');
  const events = await db.collection('whatsappwebhookevents').find({}).sort({_id: -1}).limit(3).toArray();
  console.log('Found', events.length, 'events');
  events.forEach(e => {
    console.log('-', e.kind, ':', (e.message || '').substring(0, 40));
  });
  
  process.exit(0);
}
check().catch(e => { console.error('Error:', e.message); process.exit(1); });
