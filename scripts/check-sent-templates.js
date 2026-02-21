require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  // Check recent successful templates
  const recent = await mongoose.connection.db.collection('whatsapp_messages').find({
    messageType: 'template',
    status: 'sent'
  }).sort({ createdAt: -1 }).limit(5).toArray();
  
  console.log('Recent SENT templates:');
  recent.forEach(m => {
    console.log('---');
    console.log('Template:', m.metadata?.template?.templateName);
    console.log('Status:', m.status);
    console.log('waMessageId:', m.waMessageId?.substring(0, 50));
    console.log('createdAt:', m.createdAt);
  });
  
  await mongoose.disconnect();
}
check();
