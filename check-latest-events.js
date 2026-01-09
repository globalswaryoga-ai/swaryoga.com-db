require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function check() {
  try {
    if (!mongoUri) throw new Error('Missing MongoDB URI (set MONGODB_URI_MAIN)');

    const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    await mongoose.connect(mongoUri);
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);

    const events = await crmDb
      .collection('whatsapp_webhook_events')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log('\n🔔 LATEST WEBHOOK EVENTS:');
  console.log(`DB: ${CRM_DB_NAME}`);
  console.log(`Total events: ${events.length}\n`);
    
    events.forEach((evt, i) => {
      const time = evt.createdAt ? new Date(evt.createdAt).toISOString() : 'no-createdAt';
      const kind = String(evt.kind || '').padEnd(12);
      console.log(`[${i + 1}] ${kind} | ${evt.ok ? '✅' : '❌'} | ${time}`);
      if (evt.message) console.log(`    Message: ${evt.message}`);
      if (evt.phoneNumber) console.log(`    Phone: ${evt.phoneNumber}`);
      if (evt.sample) {
        const s = JSON.stringify(evt.sample);
        console.log(`    Sample: ${s.length > 200 ? s.substring(0, 200) + '...' : s}`);
      }
      console.log();
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
