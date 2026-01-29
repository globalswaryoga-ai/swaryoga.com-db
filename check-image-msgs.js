const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Get most recent messages
  const msgs = await db.collection('whatsappmessages').find({
    phoneNumber: '919309986820'
  }).sort({_id: -1}).limit(10).toArray();
  
  console.log('Recent messages for 919309986820:');
  msgs.forEach(m => {
    console.log('---');
    console.log('ID:', m._id.toString());
    console.log('Direction:', m.direction);
    console.log('Type:', m.messageType);
    console.log('Content:', (m.messageContent || '').substring(0, 50));
    console.log('Media:', m.media ? JSON.stringify(m.media) : 'NONE');
    console.log('SentAt:', m.sentAt);
  });
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
