#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function run() {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryoga_admin_crm');

  // Check whatsapp_messages for old vs new number
  const oldMsgs = await db.collection('whatsapp_messages').countDocuments({
    $or: [{ from: /9309986820/ }, { to: /9309986820/ }]
  });
  const newMsgs = await db.collection('whatsapp_messages').countDocuments({
    $or: [{ from: /9075358557/ }, { to: /9075358557/ }]
  });

  console.log('=== WhatsApp Messages in DB ===');
  console.log('Messages with 9309986820 (old number):', oldMsgs);
  console.log('Messages with 9075358557 (new number):', newMsgs);

  // List whatsapp/qr related collections
  const colls = await db.listCollections().toArray();
  const relevant = colls.filter(c =>
    c.name.includes('qr') || c.name.includes('whatsapp') || c.name.includes('message')
  ).map(c => c.name);
  console.log('\nRelevant collections:', relevant);

  // Check leads
  const oldLeads = await db.collection('leads').countDocuments({ phone: /9309986820/ });
  const newLeads = await db.collection('leads').countDocuments({ phone: /9075358557/ });
  console.log('\n=== Leads in DB ===');
  console.log('Leads with 9309986820:', oldLeads);
  console.log('Leads with 9075358557:', newLeads);

  // Sample a few recent whatsapp_messages to see structure
  const recentMsgs = await db.collection('whatsapp_messages')
    .find({})
    .sort({ timestamp: -1 })
    .limit(5)
    .project({ from: 1, to: 1, body: 1, timestamp: 1, direction: 1, type: 1, chatId: 1 })
    .toArray();
  console.log('\n=== 5 Most Recent Messages ===');
  recentMsgs.forEach((m, i) => {
    console.log(`${i+1}. from:${m.from} to:${m.to} dir:${m.direction} body:"${(m.body||'').substring(0,50)}" ts:${m.timestamp} chatId:${m.chatId}`);
  });

  // Check for any QR-specific message collections
  for (const name of relevant) {
    if (name !== 'whatsapp_messages') {
      const count = await db.collection(name).countDocuments({});
      console.log(`\n${name}: ${count} documents`);
    }
  }

  // Total leads
  const totalLeads = await db.collection('leads').countDocuments({});
  console.log('\nTotal leads:', totalLeads);

  // Sample leads with phone numbers containing 9309986820
  const oldLeadSamples = await db.collection('leads')
    .find({ phone: /9309986820/ })
    .project({ name: 1, phone: 1, source: 1, assignedToUserId: 1, createdByUserId: 1 })
    .toArray();
  console.log('\nLeads with 9309986820:', JSON.stringify(oldLeadSamples, null, 2));

  await client.close();
}

run().catch(console.error);
