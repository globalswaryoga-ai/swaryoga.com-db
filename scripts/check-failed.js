require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const msgs = await mongoose.connection.db.collection('whatsapp_messages').find({
    messageType: 'template',
    status: 'failed',
    waMessageId: { $exists: true }
  }).sort({ createdAt: -1 }).limit(3).toArray();
  
  console.log('Failed templates WITH waMessageId:');
  msgs.forEach(m => {
    console.log('---');
    console.log('waMessageId:', m.waMessageId);
    console.log('Template:', m.metadata?.template?.templateName);
    console.log('webhookErrors:', JSON.stringify(m.webhookErrors, null, 2));
  });
  
  await mongoose.disconnect();
}
check();
