require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  await mongoose.connect(mongoUri);
  const crmDb = mongoose.connection.useDb(CRM_DB_NAME);

  const events = await crmDb
    .collection('whatsapp_webhook_events')
    .find({ source: 'qr' })
    .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
    .limit(10)
    .toArray();

  console.log(`\n🔎 QR CHAT webhook events (source='qr')`);
  console.log(`DB: ${CRM_DB_NAME}`);
  console.log(`Total: ${events.length}\n`);

  events.forEach((e, i) => {
    console.log(`[${i + 1}] kind=${e.kind} ok=${e.ok} at=${e.receivedAt || e.createdAt}`);
    console.log(`    message=${e.message}`);
    console.log(`    sampleKeys=${e.sample ? Object.keys(e.sample).join(',') : 'none'}`);
  });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
