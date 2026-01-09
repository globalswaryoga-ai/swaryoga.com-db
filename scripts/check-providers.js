const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('MONGODB_URI_MAIN not set');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    const col = db.collection('whatsapp_messages');
    
    const counts = await col.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('Message counts by provider:');
    console.log(JSON.stringify(counts, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.error);
