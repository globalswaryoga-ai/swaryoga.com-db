const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
const uri = process.env.MONGODB_URI_MAIN;
if (!uri) {
  throw new Error('MONGODB_URI_MAIN is missing. Ensure .env.local is present and configured.');
}

async function run() {
  const client = new MongoClient(uri);
  try {
    const db = client.db('swaryoga_admin_crm');
    
    // Get the FULL document structure of one inbound message
    const msg = await db.collection('whatsapp_messages').findOne({
      direction: 'inbound',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }, { sort: { createdAt: -1 } });
    
    console.log('=== Full Message Document Structure ===');
    console.log(JSON.stringify(msg, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
