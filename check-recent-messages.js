require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Get the 10 most recent outbound messages
  const messages = await db.collection('whatsapp_messages')
    .find({ direction: 'outbound' })
    .sort({ sentAt: -1 })
    .limit(10)
    .toArray();
  
  console.log('10 Most Recent Outbound Messages:');
  console.log('==================================');
  messages.forEach((m, i) => {
    const time = new Date(m.sentAt).toLocaleTimeString('en-IN');
    console.log(`${i+1}. ${time} | ${m.phoneNumber} | ${m.messageType} | ${m.status} | ${(m.failureReason || '').substring(0, 30) || '-'}`);
  });
  
  process.exit(0);
}
check().catch(e => { console.log('Error:', e.message); process.exit(1); });
