const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const Event = db.collection('whatsapp_webhook_events');
  const event = await Event.findOne({ source: 'qr' }, { sort: { receivedAt: -1 } });
  console.log(JSON.stringify(event, null, 2));
  process.exit(0);
}
run();
