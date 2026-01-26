const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkQRMessages() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;
  
  // Check recent QR messages
  const messages = await db.collection('whatsapp_messages').find({
    $or: [
      { provider: 'whatsapp_web_bridge' },
      { provider: 'whatsapp_qr' }
    ]
  }).sort({ sentAt: -1 }).limit(10).toArray();
  
  console.log('\n=== Recent QR WhatsApp Messages ===');
  console.log('Total found:', messages.length);
  
  messages.forEach((m, i) => {
    console.log(`\n[${i + 1}] ID: ${m._id}`);
    console.log('   Provider:', m.provider);
    console.log('   Direction:', m.direction);
    console.log('   Phone:', m.phoneNumber);
    console.log('   Content:', (m.messageContent || '').substring(0, 50) + '...');
    console.log('   waMessageId:', m.waMessageId || 'N/A');
    console.log('   leadId:', m.leadId);
    console.log('   Status:', m.status);
    console.log('   SentAt:', m.sentAt);
  });
  
  // Check if there are messages with bad/cracked IDs
  console.log('\n=== Checking for problematic IDs ===');
  
  // Check for messages with empty/null waMessageId
  const nullWaId = await db.collection('whatsapp_messages').countDocuments({
    waMessageId: { $in: [null, '', undefined] },
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  });
  console.log('Messages with null/empty waMessageId:', nullWaId);
  
  // Check for messages with null leadId
  const nullLeadId = await db.collection('whatsapp_messages').countDocuments({
    leadId: { $in: [null, undefined] },
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  });
  console.log('Messages with null leadId:', nullLeadId);
  
  // Sample of outbound messages
  const outbound = await db.collection('whatsapp_messages').find({
    direction: 'outbound',
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  console.log('\n=== Recent Outbound QR Messages ===');
  outbound.forEach((m, i) => {
    console.log(`[${i + 1}] To: ${m.phoneNumber}, Status: ${m.status}, waMessageId: ${m.waMessageId || 'N/A'}`);
  });
  
  // Check inbound messages
  const inbound = await db.collection('whatsapp_messages').find({
    direction: 'inbound',
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  }).sort({ sentAt: -1 }).limit(5).toArray();
  
  console.log('\n=== Recent Inbound QR Messages ===');
  inbound.forEach((m, i) => {
    console.log(`[${i + 1}] From: ${m.phoneNumber}, waMessageId: ${m.waMessageId || 'N/A'}, leadId: ${m.leadId}`);
  });
  
  // Check leads associated with QR messages
  const qrPhones = await db.collection('whatsapp_messages').distinct('phoneNumber', {
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  });
  
  console.log('\n=== Leads for QR Messages ===');
  const leads = await db.collection('leads').find({
    phoneNumber: { $in: qrPhones }
  }).limit(10).toArray();
  
  leads.forEach((l, i) => {
    console.log(`[${i + 1}] Lead: ${l._id}, Phone: ${l.phoneNumber}, Name: ${l.name}, LeadNumber: ${l.leadNumber || 'N/A'}`);
  });
  
  await mongoose.disconnect();
}

checkQRMessages().catch(console.error);
