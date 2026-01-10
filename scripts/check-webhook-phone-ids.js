
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkRecentWebhookPhoneIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const adminDb = mongoose.connection.useDb('swaryoga_admin_crm');
    
    console.log('\n--- RECENT WEBHOOK PHONE NUMBER IDS ---');
    
    const events = await adminDb.collection('whatsapp_webhook_events')
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    events.forEach(event => {
      let phoneId = 'unknown';
      try {
        if (event.payload?.entry?.[0]?.id) {
            phoneId = event.payload.entry[0].id;
        } else if (event.payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
            phoneId = event.payload.entry[0].changes[0].value.metadata.phone_number_id;
        }
      } catch (e) {}
      
      console.log(`[${event.createdAt.toISOString()}] Phone ID: ${phoneId} | Event: ${event.message || 'PAYLOAD'}`);
      if (event.payload) {
          console.log(JSON.stringify(event.payload, null, 2));
      }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkRecentWebhookPhoneIds();
