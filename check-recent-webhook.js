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
    
    // Check for any NEW webhook hits in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const events = await db.collection('whatsapp_webhook_events').find({
      createdAt: { $gte: tenMinutesAgo }
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`=== Webhook Events (Last 10 minutes) ===\n`);
    console.log(`Total events: ${events.length}\n`);
    
    if (events.length === 0) {
      console.log('❌ NO webhook events in the last 10 minutes!');
      console.log('   This means Meta is NOT sending messages to your server.');
      console.log('\n   Possible causes:');
      console.log('   1. Webhook subscription was paused by Meta again');
      console.log('   2. Messages go to a different number/account');
      console.log('   3. Network/connectivity issue');
      console.log('\n   Next step: Check Meta Developer Dashboard for webhook health');
      return;
    }
    
    events.forEach((e, i) => {
      console.log(`${i+1}. ${e.kind} | ${e.ok ? '✓' : '✗'} | ${e.phoneNumber || 'N/A'} | ${new Date(e.createdAt).toLocaleTimeString()}`);
      if (e.kind === 'inbound_message') {
        console.log(`   Preview: "${e.sample?.preview?.substring(0, 50)}"`);
      }
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
