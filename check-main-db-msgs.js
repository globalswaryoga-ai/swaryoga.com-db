const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  // Check MAIN database (swaryogaDB)
  const mainDb = mongoose.connection.useDb('swaryogaDB');
  
  console.log('Recent messages in swaryogaDB.whatsappmessages:');
  const msgs = await mainDb.collection('whatsappmessages').find({}).sort({_id: -1}).limit(5).toArray();
  
  msgs.forEach(m => {
    console.log('---');
    console.log('ID:', m._id.toString());
    console.log('Phone:', m.phoneNumber);
    console.log('Direction:', m.direction);
    console.log('Type:', m.messageType);
    console.log('Media:', m.media?.url ? 'YES: ' + m.media.url.substring(0, 50) : 'no');
    console.log('SentAt:', m.sentAt);
  });
  
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
