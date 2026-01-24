const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryoga_admin_crm?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  
  console.log('🔍 CHECKING QR WHATSAPP INBOUND MESSAGES\n');
  
  // Check all messages with QR provider
  const msgs = db.collection('whatsapp_messages');
  
  const qrInbound = await msgs.find({ 
    provider: { $in: ['whatsapp_qr', 'whatsapp_web_bridge', 'bridge'] },
    direction: 'inbound'
  }).sort({ sentAt: -1 }).limit(10).toArray();
  
  console.log('📥 QR/Bridge Inbound Messages:', qrInbound.length);
  qrInbound.forEach((m, i) => {
    console.log(`  [${i+1}] From: ${m.from} | Body: ${(m.body || '').substring(0, 40)}... | Provider: ${m.provider} | Time: ${m.sentAt}`);
  });
  
  // Check all inbound regardless of provider
  console.log('\n📬 ALL Inbound Messages (any provider):');
  const allInbound = await msgs.find({ direction: 'inbound' }).sort({ sentAt: -1 }).limit(10).toArray();
  console.log('   Count:', allInbound.length);
  allInbound.forEach((m, i) => {
    console.log(`  [${i+1}] From: ${m.from} | Provider: ${m.provider} | Time: ${m.sentAt}`);
  });
  
  // Check raw webhook events
  console.log('\n🔔 Recent Webhook Events (all kinds):');
  const webhooks = db.collection('whatsapp_webhook_events');
  const recent = await webhooks.find({}).sort({ _id: -1 }).limit(10).toArray();
  recent.forEach((w, i) => {
    console.log(`  [${i+1}] Kind: ${w.kind} | OK: ${w.ok} | Time: ${w.timestamp}`);
  });
  
  // Check total counts
  console.log('\n📊 Total Counts:');
  const totalMsgs = await msgs.countDocuments();
  const inboundCount = await msgs.countDocuments({ direction: 'inbound' });
  const outboundCount = await msgs.countDocuments({ direction: 'outbound' });
  console.log(`   Total messages: ${totalMsgs}`);
  console.log(`   Inbound: ${inboundCount}`);
  console.log(`   Outbound: ${outboundCount}`);
  
  await mongoose.disconnect();
}

check().catch(console.error);
