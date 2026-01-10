
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) {
    console.error('MONGODB_URI_MAIN NOT SET');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  const messages = await db.collection('whatsapp_messages').find().sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log('LATEST MESSAGES IN DB:');
  messages.forEach(m => {
    console.log(`[${m.createdAt?.toISOString()}] ${m.direction}: ${m.messageContent} (${m.phoneNumber || 'no-phone'}) status: ${m.status}`);
  });

  process.exit(0);
}

run().catch(console.error);
