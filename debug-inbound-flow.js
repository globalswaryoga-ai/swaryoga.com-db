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
    
    // Check ALL inbound messages
    const allMessages = await db.collection('whatsapp_messages').find({
      direction: 'inbound'
    }).sort({ createdAt: -1 }).limit(20).toArray();
    
    console.log('=== ALL Inbound Messages (Recent) ===\n');
    if (allMessages.length === 0) {
      console.log('❌ No inbound messages in the system at all!');
    } else {
      console.log(`Found ${allMessages.length} inbound messages:\n`);
      allMessages.forEach((msg, i) => {
        console.log(`${i+1}. From: ${msg.from} | "${msg.body?.substring(0, 50)}" | ${new Date(msg.createdAt).toLocaleString()}`);
      });
    }
    
    // Check all webhook inbound_message events
    console.log('\n=== Webhook inbound_message Events (Recent) ===');
    const inboundEvents = await db.collection('whatsapp_webhook_events').find({
      kind: 'inbound_message'
    }).sort({ receivedAt: -1 }).limit(20).toArray();
    
    if (inboundEvents.length === 0) {
      console.log('❌ No inbound_message events recorded!');
    } else {
      console.log(`Found ${inboundEvents.length} inbound events:\n`);
      inboundEvents.forEach((e, i) => {
        console.log(`${i+1}. From: ${e.phoneNumber} | "${e.sample?.preview?.substring(0, 50)}" | ${new Date(e.receivedAt).toLocaleString()}`);
      });
    }
    
    // Check status updates
    console.log('\n=== Webhook status_update Events (Recent) ===');
    const statusEvents = await db.collection('whatsapp_webhook_events').find({
      kind: 'status_update'
    }).sort({ receivedAt: -1 }).limit(10).toArray();
    
    console.log(`Found ${statusEvents.length} status events`);
    if (statusEvents.length > 0) {
      statusEvents.slice(0, 5).forEach((e, i) => {
        console.log(`${i+1}. Status: ${e.sample?.status} | To: ${e.sample?.recipient_id} | ${new Date(e.receivedAt).toLocaleString()}`);
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
