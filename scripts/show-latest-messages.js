const { MongoClient } = require('mongodb');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.match(/MONGODB_URI_MAIN=(.+)/)?.[1];

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  // Get latest messages
  const msgs = await db.collection('whatsapp_messages').find({}).sort({createdAt: -1}).limit(5).toArray();
  console.log('=== LATEST 5 WHATSAPP MESSAGES ===');
  msgs.forEach(m => {
    console.log('From:', m.from, '| Body:', (m.body || '').substring(0,50), '| Time:', m.createdAt);
  });
  
  // Get latest webhook events with type inbound_message
  const events = await db.collection('whatsapp_webhook_events').find({eventType: 'inbound_message'}).sort({createdAt: -1}).limit(5).toArray();
  console.log('\n=== LATEST 5 INBOUND MESSAGE EVENTS ===');
  events.forEach(e => {
    const payload = e.rawPayload || e.body || {};
    const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const body = msg?.text?.body || '';
    console.log('Time:', e.createdAt, '| From:', msg?.from, '| Body:', body.substring(0,30));
  });
  
  await client.close();
}

check().catch(console.error);
