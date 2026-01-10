const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    const db = conn.connection.useDb('swaryoga_admin_crm');
    
    const phones = ['9075358557', '919075358557', '+919075358557'];
    console.log('Searching for phones:', phones);

    // 1. Check Messages
    console.log('\n--- Checking whatsapp_messages ---');
    const messages = await db.collection('whatsapp_messages').find({
      phoneNumber: { $in: phones }
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    if (messages.length === 0) {
      console.log('❌ No processed messages found.');
    } else {
      messages.forEach(m => {
        console.log(`[${m.createdAt}] ${m.direction}: ${m.messageContent} (Status: ${m.status})`);
      });
    }

    // 2. Check Raw Webhook Events
    console.log('\n--- Checking whatsapp_webhook_events ---');
    // Using regex loosely to find the number in the JSON payload
    const regex = /9075358557/;
    const rawEvents = await db.collection('whatsapp_webhook_events').find({
      $or: [
        { "payload.entry.changes.value.messages.from": { $in: phones } },
        { "payload_string": { $regex: regex } } // Fallback if payload isn't structured or nested differently
      ]
    }).sort({ receivedAt: -1 }).limit(5).toArray();

    if (rawEvents.length === 0) {
      console.log('❌ No raw webhook events found with this number.');
    } else {
      rawEvents.forEach(e => {
        console.log(`[${e.receivedAt}] Type: ${e.eventType} - ID: ${e._id}`);
        // console.log(JSON.stringify(e.payload, null, 2));
      });
    }

    // 3. Check Leads
    console.log('\n--- Checking leads ---');
    const leads = await db.collection('leads').find({
      phoneNumber: { $in: phones }
    }).toArray();
    
    if (leads.length === 0) {
      console.log('❌ No lead found with this number.');
    } else {
      leads.forEach(l => {
        console.log(`Lead: ${l.name} (${l.phoneNumber}) - ID: ${l._id}`);
      });
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

check();
