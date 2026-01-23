const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function check() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.useDb(CRM_DB_NAME);
  const Event = db.model('Event', new mongoose.Schema({}, { strict: false, collection: 'whatsapp_webhook_events' }));
  
  const recent = await Event.find({}).sort({ receivedAt: -1 }).limit(10).lean();
  console.log('--- LATEST WEBHOOK EVENTS (ANY KIND) ---');
  recent.forEach(e => {
    console.log(`[${e.receivedAt}] ID: ${e._id} | Kind: ${e.kind} | Msg: ${e.message} | OK: ${e.ok}`);
    if (e.sample && e.sample.rawBodyPreview) {
       console.log('Body Preview:', e.sample.rawBodyPreview.substring(0, 500));
    }
    console.log('---');
  });
  process.exit(0);
}
check();
