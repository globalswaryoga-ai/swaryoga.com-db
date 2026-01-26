const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;
  
  // Find messages without leadId
  const noLeadMsgs = await db.collection('whatsapp_messages').find({
    leadId: { $in: [null, undefined] },
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  }).toArray();
  
  console.log('Messages without leadId:', noLeadMsgs.length);
  noLeadMsgs.forEach((m, i) => {
    console.log(`[${i+1}] Phone: ${m.phoneNumber}, Content: ${(m.messageContent||'').substring(0,30)}, Dir: ${m.direction}`);
  });
  
  // Check waMessageId patterns
  console.log('\n--- waMessageId patterns (last 20) ---');
  const allMsgs = await db.collection('whatsapp_messages').find({
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  }).sort({ sentAt: -1 }).limit(20).toArray();
  
  let unknownCount = 0;
  let validCount = 0;
  
  allMsgs.forEach((m, i) => {
    const waId = m.waMessageId || 'N/A';
    const isUnknown = waId.startsWith('unknown-');
    if (isUnknown) unknownCount++;
    else if (waId !== 'N/A') validCount++;
    console.log(`[${i+1}] ${isUnknown ? '⚠️' : '✅'} waMessageId: ${waId.substring(0, 60)}`);
  });
  
  console.log(`\nSummary: ${validCount} valid, ${unknownCount} unknown-*, ${20 - validCount - unknownCount} N/A`);
  
  // Count all unknown-* messages
  const totalUnknown = await db.collection('whatsapp_messages').countDocuments({
    waMessageId: { $regex: /^unknown-/ },
    $or: [{ provider: 'whatsapp_web_bridge' }, { provider: 'whatsapp_qr' }]
  });
  console.log(`\nTotal messages with unknown-* waMessageId: ${totalUnknown}`);
  
  await mongoose.disconnect();
}

check().catch(console.error);
