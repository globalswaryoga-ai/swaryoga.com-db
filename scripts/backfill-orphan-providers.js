const { MongoClient } = require('mongodb');
async function main() {
  const c = await MongoClient.connect('mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/');
  const db = c.db('swaryoga_admin_crm');
  const coll = db.collection('whatsapp_messages');
  
  const nullMsgs = await coll.find({ provider: null }).limit(3).project({ provider:1, direction:1, phoneNumber:1, messageType:1 }).toArray();
  const pendingMsgs = await coll.find({ provider: 'pending' }).limit(3).project({ provider:1, direction:1, phoneNumber:1, messageType:1 }).toArray();
  const noneMsgs = await coll.find({ provider: 'none' }).limit(3).project({ provider:1, direction:1, phoneNumber:1, messageType:1 }).toArray();
  
  console.log('NULL:', JSON.stringify(nullMsgs));
  console.log('PENDING:', JSON.stringify(pendingMsgs));
  console.log('NONE:', JSON.stringify(noneMsgs));
  
  // Backfill: assign pending/null/none to meta (they're old pre-provider messages)
  const r1 = await coll.updateMany({ provider: null }, { $set: { provider: 'meta' } });
  const r2 = await coll.updateMany({ provider: 'pending' }, { $set: { provider: 'meta' } });
  const r3 = await coll.updateMany({ provider: 'none' }, { $set: { provider: 'meta' } });
  console.log('Backfilled null->' + r1.modifiedCount + ' pending->' + r2.modifiedCount + ' none->' + r3.modifiedCount);
  
  // Verify final distribution
  const result = await coll.aggregate([
    { $group: { _id: '$provider', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('Final distribution:', JSON.stringify(result));
  await c.close();
}
main().catch(e => console.error(e));
