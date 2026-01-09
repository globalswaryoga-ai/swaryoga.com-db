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
    
    // Get messages from the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const messages = await db.collection('whatsapp_messages').find({
      from: /919309986820/,
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 }).toArray();
    
    console.log('=== Messages from 919309986820 (Last 5 minutes) ===\n');
    
    if (messages.length === 0) {
      console.log('❌ No messages received in the last 5 minutes');
      console.log('\nDebugging info:');
      
      // Check webhook events
      const recentEvents = await db.collection('whatsapp_webhook_events').find({
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).limit(10).toArray();
      
      console.log('Recent webhook events:', recentEvents.length);
      recentEvents.forEach((e, i) => {
        console.log(`  ${i+1}. ${e.kind} (${e.ok ? '✓' : '✗'}) - ${e.receivedAt}`);
      });
      
    } else {
      console.log(`✅ Received ${messages.length} messages!\n`);
      messages.forEach((msg, index) => {
        console.log(`Message ${index + 1}:`);
        console.log(`  From: ${msg.from}`);
        console.log(`  Body: ${msg.body}`);
        console.log(`  Received: ${new Date(msg.createdAt).toLocaleString()}`);
        console.log(`  Status: ${msg.status || 'delivered'}`);
        console.log('');
      });
    }
    
    // Show all recent webhook activity
    const allRecentEvents = await db.collection('whatsapp_webhook_events').find({
      createdAt: { $gte: fiveMinutesAgo }
    }).sort({ createdAt: -1 }).toArray();
    
    if (allRecentEvents.length > 0) {
      console.log('=== Webhook Activity (Last 5 minutes) ===');
      allRecentEvents.forEach((e) => {
        console.log(`${e.kind}: ${e.ok ? '✓' : '✗'} - ${e.receivedAt} - ${e.phoneNumber || ''}`);
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
