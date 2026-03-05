const { MongoClient } = require('mongodb');
(async () => {
  const c = new MongoClient('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  await c.connect();
  const db = c.db('swaryoga_admin_crm');
  const coll = db.collection('whatsapp_messages');

  const phones = ['918767574117', '917738093173', '919423784888'];
  for (const p of phones) {
    const provs = await coll.distinct('provider', { phoneNumber: p });
    console.log(p, provs);
  }

  const metaOnly = await coll.aggregate([
    { $match: { provider: 'meta' } },
    { $group: { _id: '$phoneNumber' } },
    { $count: 'total' }
  ]).toArray();
  console.log('Meta inbox contacts:', metaOnly[0]?.total || 0);

  const qrOnly = await coll.aggregate([
    { $match: { provider: { $in: ['whatsapp_web_bridge', 'whatsapp_qr', 'qr'] } } },
    { $group: { _id: '$phoneNumber' } },
    { $count: 'total' }
  ]).toArray();
  console.log('QR inbox contacts:', qrOnly[0]?.total || 0);

  await c.close();
})().catch(e => { console.error(e); process.exit(1); });
