const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryoga_admin_crm');
  const db = mongoose.connection.db;
  
  console.log('🔍 Looking for REAL inbound messages (not test data)\n');
  
  // Check for real messages with Indian phone numbers
  const realMsgs = await db.collection('whatsapp_messages').find({
    direction: 'inbound',
    $or: [
      { phoneNumber: { $regex: /^91\d{10}$/ } },
      { senderNumber: { $regex: /^91\d{10}$/ } }
    ]
  }).sort({ sentAt: -1 }).limit(10).toArray();
  
  console.log('Real Indian phone number inbound messages:', realMsgs.length);
  realMsgs.forEach((m, i) => {
    console.log(`[${i+1}] Phone: ${m.phoneNumber || m.senderNumber} | Body: ${(m.messageContent || m.body || '').substring(0,40)}... | Provider: ${m.provider} | Time: ${m.sentAt}`);
  });
  
  // Check for any recent webhooks
  console.log('\n🔔 Last 10 Webhook Events:');
  const webhooks = await db.collection('whatsapp_webhook_events').find({}).sort({ _id: -1 }).limit(10).toArray();
  webhooks.forEach((w, i) => {
    const body = w.sample?.body || w.sample || {};
    const phoneId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || 'N/A';
    console.log(`[${i+1}] Kind: ${w.kind} | Phone ID: ${phoneId} | OK: ${w.ok}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
