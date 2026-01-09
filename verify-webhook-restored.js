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
    
    // Check for recent verification success
    const verifyEvent = await db.collection('whatsapp_webhook_events').findOne({
      kind: 'verify',
      ok: true
    }, { sort: { receivedAt: -1 } });
    
    if (verifyEvent) {
      console.log('✅ WEBHOOK VERIFICATION SUCCESSFUL');
      console.log('   Time:', verifyEvent.receivedAt);
      console.log('   Status: Active and Ready');
    } else {
      console.log('⏳ Waiting for verification...');
    }
    
    // Check for inbound messages
    const recentMsg = await db.collection('whatsapp_messages').find({
      from: /919309986820/
    }).sort({ timestamp: -1 }).limit(1).toArray();
    
    if (recentMsg.length > 0) {
      console.log('\n✅ INCOMING MESSAGES DETECTED');
      console.log('   Latest from 919309986820:', recentMsg[0].body);
      console.log('   Received:', new Date(recentMsg[0].timestamp).toISOString());
    } else {
      console.log('\n⏳ Awaiting inbound messages from 919309986820');
    }
    
    // Summary
    console.log('\n--- Webhook Status ---');
    const totalEvents = await db.collection('whatsapp_webhook_events').countDocuments();
    const totalMessages = await db.collection('whatsapp_messages').countDocuments({
      from: /919309986820/
    });
    console.log('Total webhook events:', totalEvents);
    console.log('Messages from 919309986820:', totalMessages);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
