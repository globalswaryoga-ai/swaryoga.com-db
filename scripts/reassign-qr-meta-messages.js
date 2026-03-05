const { MongoClient } = require('mongodb');

/**
 * Reassign meta messages for contacts that are primarily QR contacts.
 * 
 * Strategy: If a contact has QR-provider messages (qr, whatsapp_web_bridge, whatsapp_qr),
 * then any meta-provider messages for that contact were created by the automation system
 * (auto-replies sent via Meta Cloud API). Reassign those to whatsapp_web_bridge so the
 * contact only appears in the QR inbox.
 */
async function main() {
  const c = new MongoClient('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  await c.connect();
  const db = c.db('swaryoga_admin_crm');
  const coll = db.collection('whatsapp_messages');

  // Find all phone numbers that have QR-provider messages
  const qrContacts = await coll.aggregate([
    { $match: { provider: { $in: ['qr', 'whatsapp_web_bridge', 'whatsapp_qr'] } } },
    { $group: { _id: '$phoneNumber' } }
  ]).toArray();

  const qrPhones = qrContacts.map(c => c._id);
  console.log('QR contacts:', qrPhones.length);

  // Reassign meta messages for these QR contacts to whatsapp_web_bridge
  const result = await coll.updateMany(
    { phoneNumber: { $in: qrPhones }, provider: 'meta' },
    { $set: { provider: 'whatsapp_web_bridge', _migratedFromMeta: true } }
  );
  console.log('Reassigned:', result.modifiedCount, 'meta messages to whatsapp_web_bridge');

  // Final distribution
  const dist = await coll.aggregate([
    { $group: { _id: '$provider', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Final distribution:', JSON.stringify(dist));

  // Verify no mixed contacts remain
  const mixed = await coll.aggregate([
    { $group: { _id: '$phoneNumber', providers: { $addToSet: '$provider' } } },
    { $match: { providers: { $all: ['meta'] }, $expr: { $gt: [{ $size: '$providers' }, 1] } } }
  ]).toArray();
  console.log('Remaining mixed contacts:', mixed.length);

  await c.close();
}

main().catch(e => { console.error(e); process.exit(1); });
