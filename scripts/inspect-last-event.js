
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI_MAIN;
  const dbName = 'swaryoga_admin_crm';
  await mongoose.connect(uri, { dbName });
  const coll = mongoose.connection.collection('whatsapp_webhook_events');
  
  console.log("Fetching last inbound_message event...");
  const event = await coll.findOne({ kind: 'inbound_message' }, { sort: { receivedAt: -1 } });
  
  if (event) {
    console.log("--- EVENT DETAILS ---");
    console.log(JSON.stringify(event, null, 2));
    
    if (event.sample && event.sample.messages) {
       console.log("\n--- MESSAGES IN PAYLOAD ---");
       console.log(JSON.stringify(event.sample.messages, null, 2));
    }
  } else {
    console.log("No inbound_message event found.");
  }
  
  await mongoose.disconnect();
}
run();
