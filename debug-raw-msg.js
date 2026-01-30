const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Get raw message to see actual structure
  const msg = await db.collection('whatsapp_messages').findOne({}, { sort: { _id: -1 } });
  console.log('=== Raw Message Document ===');
  console.log(JSON.stringify(msg, null, 2));
  
  await client.close();
}
check().catch(console.error);
