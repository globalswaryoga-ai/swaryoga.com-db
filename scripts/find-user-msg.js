
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function findSpecificMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    const adminDb = mongoose.connection.useDb('swaryoga_admin_crm');
    
    console.log('Searching for 9075358557 in the last hour...');
    
    const messages = await adminDb.collection('whatsapp_webhook_events')
      .find({
        createdAt: { $gt: new Date(Date.now() - 3600000) }
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${messages.length} events in the last hour.`);
    
    messages.forEach(event => {
        const bodyStr = JSON.stringify(event.payload || event.sample?.body || {});
        if (bodyStr.includes('9075358557')) {
            console.log(`\n✅ MATCH FOUND at ${event.createdAt.toISOString()}`);
            console.log(JSON.stringify(event.payload || event.sample?.body, null, 2));
        }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findSpecificMessages();
