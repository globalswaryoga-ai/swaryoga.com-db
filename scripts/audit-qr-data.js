/**
 * Audit ALL QR WhatsApp data across all collections.
 * Shows what exists, what's leaking, and what needs cleaning.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  console.log('═══════════════════════════════════════');
  console.log('  QR WHATSAPP DATA AUDIT');
  console.log('═══════════════════════════════════════\n');

  // 1. CRM User Settings
  console.log('── 1. crm_user_settings ──');
  const settings = await crm.collection('crm_user_settings').find({}).toArray();
  console.log('Total records:', settings.length);
  settings.forEach(s => {
    console.log('  userId:', s.userId);
    console.log('    qrBridgeUrl:', s.qrBridgeUrl || '(none)');
    console.log('    qrBridgeSecret:', s.qrBridgeSecret ? 'SET' : '(none)');
    console.log('    qrWhatsappEnabled:', s.qrWhatsappEnabled || false);
    console.log('    chatFunnels:', Object.keys(s.chatFunnels || {}).length, 'entries');
    console.log('    chatLabels:', Object.keys(s.chatLabels || {}).length, 'entries');
    console.log('    qrFunnelStages:', (s.qrFunnelStages || []).length, 'stages');
    console.log('    labelPresets:', (s.labelPresets || []).length, 'presets');
    console.log('');
  });

  // 2. WhatsApp Messages
  console.log('── 2. whatsapp_messages ──');
  const msgCount = await crm.collection('whatsapp_messages').countDocuments();
  console.log('Total messages:', msgCount);
  const byOwner = await crm.collection('whatsapp_messages').aggregate([
    { $group: { _id: '$bridgeUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('By owner:');
  byOwner.forEach(g => console.log('  ', g._id || '(untagged)', ':', g.count));

  const byProvider = await crm.collection('whatsapp_messages').aggregate([
    { $group: { _id: '$provider', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('By provider:');
  byProvider.forEach(g => console.log('  ', g._id || '(none)', ':', g.count));

  // 3. Baileys Auth State
  console.log('\n── 3. baileys_auth_state ──');
  const authCount = await crm.collection('baileys_auth_state').countDocuments();
  console.log('Total auth records:', authCount);
  const authPrefixes = await crm.collection('baileys_auth_state').aggregate([
    { $project: { prefix: { $arrayElemAt: [{ $split: ['$key', ':'] }, 0] } } },
    { $group: { _id: '$prefix', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('By user prefix:');
  authPrefixes.forEach(g => console.log('  ', g._id, ':', g.count));

  // 4. Webhook events
  console.log('\n── 4. whatsapp_webhook_events ──');
  const webhookCount = await crm.collection('whatsapp_webhook_events').countDocuments();
  console.log('Total webhook events:', webhookCount);

  // 5. CRM Leads (in main DB)
  console.log('\n── 5. CRM Leads (main DB) ──');
  const leadsCol = crm.collection('leads');
  const leadCount = await leadsCol.countDocuments();
  console.log('Total leads:', leadCount);
  const byAssigned = await leadsCol.aggregate([
    { $group: { _id: '$assignedToUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();
  console.log('By assignedToUserId (top 10):');
  byAssigned.forEach(g => console.log('  ', g._id || '(unassigned)', ':', g.count));

  // 6. Identify the leak
  console.log('\n═══════════════════════════════════════');
  console.log('  LEAK ANALYSIS');
  console.log('═══════════════════════════════════════');
  console.log('Problem: Non-admin users see 148 chats.');
  console.log('Sources of chat data in frontend:');
  console.log('  1. Bridge /chats endpoint → proxy filters by lead ownership');
  console.log('  2. CRM /api/admin/crm/leads → fetches ALL leads for all users');
  console.log('  3. Frontend merges leads into chat list (lines 510-545 in page.tsx)');
  console.log('');
  console.log('The leads API returns ALL leads to every admin user.');
  console.log('Frontend adds them as chat items = LEAK of 148+ contacts to every user.');

  // List all collections in CRM DB
  console.log('\n── All CRM DB collections ──');
  const collections = await crm.listCollections().toArray();
  collections.forEach(c => console.log('  ', c.name));

  await mongoose.disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });
