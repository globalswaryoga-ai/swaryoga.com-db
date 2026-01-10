
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkRawMessages() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('MONGODB_URI_MAIN not set');
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    const collection = db.collection('whatsapp_webhook_events');

    console.log('Checking recent RAW_POST_RECEIVED events...');
    const events = await collection.find({
      message: 'RAW_POST_RECEIVED'
    }).sort({ receivedAt: -1 }).limit(10).toArray();

    console.log(`Found ${events.length} events.`);

    events.forEach((ev, i) => {
      console.log(`\n--- Event ${i + 1} (${ev.receivedAt}) ---`);
      if (ev.sample && ev.sample.rawBodyPreview) {
        console.log('Body Preview:', ev.sample.rawBodyPreview);
        try {
          const payload = JSON.parse(ev.sample.rawBodyPreview);
          console.log('Parsed JSON Structure:', JSON.stringify(payload, null, 2).substring(0, 500));
        } catch (e) {
          console.log('Body is not valid JSON or truncated');
        }
      } else {
        console.log('No rawBodyPreview found');
      }
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkRawMessages();
