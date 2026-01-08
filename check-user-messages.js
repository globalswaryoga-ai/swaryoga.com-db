require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'swaryoga_admin_crm' });
  const msgs = await mongoose.connection.collection('whatsapp_messages')
    .find({ phoneNumber: '919309986820' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('Last 5 messages for 919309986820:');
  msgs.forEach(m => {
    console.log(`- [${m.direction}] ${m.messageContent} (${m.createdAt}) provider: ${m.provider}`);
  });
  process.exit(0);
}

check();
