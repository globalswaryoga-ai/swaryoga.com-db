const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Check recent messages
  const msgs = await db.collection('whatsapp_messages').find({}).sort({timestamp: -1}).limit(5).toArray();
  console.log('=== Recent 5 Messages ===');
  msgs.forEach(m => {
    console.log({
      from: m.from,
      to: m.to,
      body: (m.body || '').slice(0,30),
      type: m.messageType,
      hasMedia: !!m.media?.url,
      mediaUrl: m.media?.url?.slice(0,50),
      time: m.timestamp
    });
  });
  
  // Check recent webhook events
  const events = await db.collection('whatsapp_webhook_events').find({}).sort({receivedAt: -1}).limit(3).toArray();
  console.log('\n=== Recent Webhook Events ===');
  events.forEach(e => {
    console.log({
      type: e.eventType,
      time: e.receivedAt,
      processed: e.processed
    });
  });

  // Check if dev server can reach production API
  console.log('\n=== Connectivity ===');
  console.log('Bridge URL:', process.env.WHATSAPP_BRIDGE_URL || 'NOT SET');
  
  await client.close();
}
check().catch(console.error);
