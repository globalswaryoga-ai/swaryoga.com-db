require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Get recent outbound messages
  const messages = await db.collection('whatsapp_messages')
    .find({ direction: 'outbound', messageType: 'template' })
    .sort({ sentAt: -1 })
    .limit(5)
    .toArray();
  
  console.log('Recent Template Messages:');
  console.log('=========================');
  if (messages.length === 0) {
    console.log('No templates found in DB!');
  }
  messages.forEach(m => {
    console.log(`Phone: ${m.phoneNumber}`);
    console.log(`Content: ${m.messageContent?.substring(0, 50)}...`);
    console.log(`Status: ${m.status}`);
    console.log(`Template: ${m.metadata?.template?.templateName || 'N/A'}`);
    console.log(`Time: ${m.sentAt}`);
    console.log('---');
  });
  
  // Also check any recent outbound regardless of type
  console.log('\nRecent ALL Outbound:');
  const allOut = await db.collection('whatsapp_messages')
    .find({ direction: 'outbound' })
    .sort({ sentAt: -1 })
    .limit(3)
    .toArray();
  
  allOut.forEach(m => {
    console.log(`${m.phoneNumber} | ${m.messageType} | ${m.status} | ${m.sentAt}`);
  });
  
  process.exit(0);
}
check().catch(e => { console.log('Error:', e.message); process.exit(1); });
