#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function run() {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Recent webhook events
  const events = await db.collection('whatsapp_webhook_events')
    .find({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .limit(20)
    .project({ kind: 1, ok: 1, message: 1, createdAt: 1, _id: 0 })
    .toArray();
  console.log('--- RECENT 20 WEBHOOK EVENTS ---');
  events.forEach(e => {
    const d = new Date(e.createdAt).toISOString();
    const s = e.ok ? 'OK' : 'FAIL';
    const m = (e.message || '').substring(0, 80);
    console.log(d, e.kind, s, m);
  });

  // Event kinds distribution
  const kinds = await db.collection('whatsapp_webhook_events').aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: '$kind', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\n--- WEBHOOK EVENT KINDS (last 7 days) ---');
  kinds.forEach(k => console.log(' ', k._id, ':', k.count));

  // Inbound events last 30 days
  const inbound = await db.collection('whatsapp_webhook_events')
    .find({ kind: 'inbound', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .limit(5)
    .project({ kind: 1, ok: 1, message: 1, createdAt: 1, _id: 0 })
    .toArray();
  console.log('\n--- RECENT INBOUND EVENTS (last 30 days) ---');
  if (!inbound.length) console.log('  NONE FOUND');
  else inbound.forEach(e => console.log(new Date(e.createdAt).toISOString(), (e.message || '').substring(0, 100)));

  // All WhatsApp messages
  const msgs = await db.collection('whatsappmessages')
    .find({}).sort({ createdAt: -1 }).limit(10)
    .project({ direction: 1, provider: 1, from_number: 1, to_number: 1, body: 1, createdAt: 1, _id: 0 })
    .toArray();
  console.log('\n--- ALL WHATSAPP MESSAGES (latest 10) ---');
  msgs.forEach(m => {
    const d = new Date(m.createdAt).toISOString();
    const b = (m.body || '').substring(0, 50);
    console.log(d, m.direction, m.provider, m.from_number, '->', m.to_number, b);
  });

  // Check for template messages/broadcasts
  const bcCount = await db.collection('broadcastmessages').estimatedDocumentCount();
  console.log('\n--- BROADCAST MESSAGES ---');
  console.log('  Total:', bcCount);

  // Lead count 
  const leadCount = await db.collection('leads').estimatedDocumentCount();
  console.log('\n--- LEADS ---');
  console.log('  Total:', leadCount);

  await c.close();
}

run().catch(console.error);
