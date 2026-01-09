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
    
    console.log('Finding messages with null provider...');
    const res = await col.updateMany(
      { provider: { $exists: false } },
      { $set: { provider: 'meta' } }
    );
    console.log('Updated non-existent provider:', res.modifiedCount);

    const res2 = await col.updateMany(
        { provider: null },
        { $set: { provider: 'meta' } }
      );
    console.log('Updated null provider:', res2.modifiedCount);

  } finally {
    await client.close();
  }
}

run().catch(console.error);
