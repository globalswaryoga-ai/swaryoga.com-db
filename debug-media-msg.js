const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Find an inbound message with media
  const msg = await db.collection('whatsapp_messages').findOne({
    $or: [
      { messageType: 'image' },
      { messageType: 'media' },
      { 'media.url': { $exists: true } }
    ]
  }, { sort: { _id: -1 } });
  
  console.log('=== Message with Media ===');
  console.log(JSON.stringify(msg, null, 2));
  
  // Also check total count of media messages
  const mediaCount = await db.collection('whatsapp_messages').countDocuments({
    $or: [
      { messageType: 'image' },
      { messageType: 'media' },
      { 'media.url': { $exists: true } }
    ]
  });
  console.log('\nTotal media messages:', mediaCount);
  
  await client.close();
}
check().catch(console.error);
