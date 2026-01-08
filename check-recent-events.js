require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'swaryoga_admin_crm' });
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  console.log('Checking for events since:', tenMinsAgo.toISOString());
  
  const events = await mongoose.connection.collection('whatsapp_webhook_events')
    .find({ createdAt: { $gte: tenMinsAgo } })
    .sort({ createdAt: -1 })
    .toArray();
    
  console.log(`Found ${events.length} events in last 10 minutes.`);
  events.forEach(e => {
    console.log(`- [${e.kind}] ok: ${e.ok} msg: ${e.message} at ${e.createdAt}`);
  });
  
  const messages = await mongoose.connection.collection('whatsapp_messages')
    .find({ createdAt: { $gte: tenMinsAgo } })
    .sort({ createdAt: -1 })
    .toArray();
    
  console.log(`Found ${messages.length} messages in last 10 minutes.`);
  messages.forEach(m => {
    console.log(`- [${m.direction}] ${m.phoneNumber} content: ${String(m.messageContent).substring(0, 20)} at ${m.createdAt}`);
  });

  process.exit(0);
}

check();
