require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGODB_URI_MAIN;
  const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.useDb(CRM_DB_NAME);

  const docs = await db
    .collection('whatsapp_webhook_events')
    .find({})
    .sort({ createdAt: -1, receivedAt: -1, _id: -1 })
    .limit(5)
    .toArray();

  console.log(`DB: ${CRM_DB_NAME}`);
  console.log(`Latest ${docs.length} webhook_events:`);
  docs.forEach((d, i) => {
    console.log(`[${i + 1}] source=${d.source} kind=${d.kind} ok=${d.ok} createdAt=${d.createdAt} receivedAt=${d.receivedAt}`);
    console.log(`    message=${d.message}`);
    console.log(`    sampleKeys=${d.sample ? Object.keys(d.sample).join(',') : 'none'}`);
  });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
