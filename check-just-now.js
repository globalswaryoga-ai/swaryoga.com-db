const { MongoClient } = require('mongodb');

async function checkVeryRecent() {
  require('dotenv').config({ path: '.env.local' });
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) throw new Error('MONGODB_URI_MAIN is missing. Ensure .env.local is present and configured.');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    
    console.log('--- RECENT MESSAGES (LAST 10 MINUTES) ---');
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const messages = await db.collection('whatsapp_messages')
      .find({ createdAt: { $gte: tenMinsAgo } })
      .sort({ createdAt: -1 })
      .toArray();

    if (messages.length === 0) {
      console.log('No messages in the last 10 minutes.');
    } else {
      messages.forEach(m => {
        console.log(`[${m.createdAt?.toISOString()}] From: ${m.phoneNumber}, Dir: ${m.direction}, Body: ${m.messageContent?.substring(0, 50)}, provider: ${m.provider}`);
      });
    }

    console.log('\n--- RECENT WEBHOOK EVENTS (LAST 10 MINUTES) ---');
    const events = await db.collection('whatsapp_webhook_events')
      .find({ receivedAt: { $gte: tenMinsAgo } })
      .sort({ receivedAt: -1 })
      .toArray();

    if (events.length === 0) {
      console.log('No webhook events in the last 10 minutes.');
    } else {
      events.forEach(e => {
        console.log(`[${e.receivedAt?.toISOString()}] Kind: ${e.kind}, OK: ${e.ok}${e.waMessageId ? `, ID: ${e.waMessageId}` : ''}`);
        if (!e.ok) console.log(`  Sample: ${JSON.stringify(e.sample)}`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkVeryRecent();
