/**
 * Full audit + cleanup of QR WhatsApp data for multi-tenant rebuild
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const crm = mongoose.connection.useDb('swaryoga_admin_crm');

  console.log('=== QR WHATSAPP DATA AUDIT ===\n');

  // 1. whatsapp_messages
  const msgCol = crm.collection('whatsapp_messages');
  const totalMsgs = await msgCol.countDocuments();
  const byOwner = await msgCol.aggregate([
    { $group: { _id: '$bridgeUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('whatsapp_messages:', totalMsgs, 'total');
  byOwner.forEach(g => console.log('  owner:', g._id || '(none)', '->', g.count));

  // 2. baileys_auth_state
  const authCol = crm.collection('baileys_auth_state');
  const totalAuth = await authCol.countDocuments();
  const authPrefixes = await authCol.aggregate([
    { $project: { prefix: { $arrayElemAt: [{ $split: ['$key', ':'] }, 0] } } },
    { $group: { _id: '$prefix', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nbaileys_auth_state:', totalAuth, 'total');
  authPrefixes.forEach(g => console.log('  prefix:', g._id, '->', g.count));

  // 3. crm_user_settings
  const settingsCol = crm.collection('crm_user_settings');
  const allSettings = await settingsCol.find({}).toArray();
  console.log('\ncrm_user_settings:', allSettings.length, 'total');
  allSettings.forEach(s => {
    console.log('  userId:', s.userId);
    console.log('    qrBridgeUrl:', s.qrBridgeUrl || '(none)');
    console.log('    qrBridgeSecret:', s.qrBridgeSecret ? 'SET' : '(none)');
    console.log('    qrWhatsappEnabled:', s.qrWhatsappEnabled || false);
    console.log('    chatFunnels keys:', Object.keys(s.chatFunnels || {}).length);
    console.log('    chatLabels keys:', Object.keys(s.chatLabels || {}).length);
  });

  // 4. CRM leads count
  const db = mongoose.connection.db;
  const leadsCol = db.collection('leads');
  const totalLeads = await leadsCol.countDocuments();
  const leadsByAssigned = await leadsCol.aggregate([
    { $group: { _id: '$assignedToUserId', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('\nleads:', totalLeads, 'total');
  leadsByAssigned.forEach(g => console.log('  assignedTo:', g._id || '(none)', '->', g.count));

  // 5. Admin users
  const usersCol = db.collection('users');
  const admins = await usersCol.find({ isAdmin: true }).project({ userId: 1, email: 1 }).toArray();
  console.log('\nadmin users:', admins.length);
  admins.forEach(u => console.log('  ', u.userId || u.email));

  await mongoose.disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });
