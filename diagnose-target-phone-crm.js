
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const CRM_DB_NAME = 'swaryoga_admin_crm';
const MAIN_DB_NAME = 'swaryogaDB';
const TARGET_PHONE = '9075358557';

async function diagnose() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN is missing');
    return;
  }

  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log('✅ Connected to Mongo Cluster');

    const potentialPhones = [TARGET_PHONE, `91${TARGET_PHONE}`, `+91${TARGET_PHONE}`];
    console.log('🔍 Searching for:', potentialPhones);

    // Check CRM DB
    const crmDb = conn.useDb(CRM_DB_NAME);
    
    // Check Leads
    const leads = await crmDb.collection('leads').find({
      phoneNumber: { $in: potentialPhones }
    }).toArray();
    console.log(`\n📂 [CRM DB] Leads found: ${leads.length}`);
    leads.forEach(l => console.log(` - ID: ${l._id} | Phone: ${l.phoneNumber} | Name: ${l.name}`));

    // Check Messages
    const msgs = await crmDb.collection('messages').find({
      $or: [
        { phoneNumber: { $in: potentialPhones } },
        { 'from': { $in: potentialPhones } }
      ]
    }).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`\n📂 [CRM DB] Messages found: ${msgs.length}`);
    msgs.forEach(m => console.log(` - ${m.direction} | ${m.messageContent} | ${m.createdAt}`));

    // Check Webhook Events (Raw logs)
    // Sometimes raw payloads are saved here
    const events = await crmDb.collection('whatsapp_webhook_events').find({
      $or: [
        { 'payload.entry.changes.value.messages.from': { $in: potentialPhones } },
        { 'payload.entry.changes.value.contacts.wa_id': { $in: potentialPhones } }
      ]
    }).sort({ receivedAt: -1 }).limit(5).toArray();
     console.log(`\nEvents found via 'whatsapp_webhook_events': ${events.length}`);


    // Check Main DB (just in case)
    const mainDb = conn.useDb(MAIN_DB_NAME);
    const mainUsers = await mainDb.collection('users').find({
      phone: { $in: potentialPhones }
    }).toArray();
    console.log(`\n📂 [Main DB] Users found: ${mainUsers.length}`);

    await conn.close();

  } catch (err) {
    console.error(err);
  }
}

diagnose();
