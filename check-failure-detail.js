require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  
  // Get recent template messages with failure reasons
  const messages = await db.collection('whatsapp_messages')
    .find({ direction: 'outbound', messageType: 'template' })
    .sort({ sentAt: -1 })
    .limit(3)
    .toArray();
  
  console.log('Template Failure Details:');
  console.log('=========================');
  messages.forEach(m => {
    console.log(`Phone: ${m.phoneNumber}`);
    console.log(`Status: ${m.status}`);
    console.log(`Failure Reason: ${m.failureReason || 'none'}`);
    console.log(`Time: ${m.sentAt}`);
    console.log('---');
  });
  
  process.exit(0);
}
check().catch(e => { console.log('Error:', e.message); process.exit(1); });
