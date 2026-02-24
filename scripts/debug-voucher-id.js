require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryoga_admin_crm');
  
  // Check document exists
  const v = await db.collection('tally_manual_vouchers').findOne({ voucherNumber: 'INV-0003' });
  console.log('Doc exists:', !!v);
  console.log('_id type:', typeof v._id, v._id.constructor.name);
  console.log('_id value:', v._id.toString());
  console.log('_id hex:', v._id.toHexString ? v._id.toHexString() : 'no toHexString');
  
  // Try to find by the hex string (as Mongoose would)
  try {
    const byId = await db.collection('tally_manual_vouchers').findOne({ _id: new ObjectId('699d21100bffd192d99126f2') });
    console.log('Found by ObjectId:', !!byId);
  } catch (e) {
    console.log('ObjectId lookup error:', e.message);
  }
  
  // Check if _id is possibly a string instead of ObjectId
  const byStringId = await db.collection('tally_manual_vouchers').findOne({ _id: '699d21100bffd192d99126f2' });
  console.log('Found by string _id:', !!byStringId);
  
  // Also check all docs to see their _id types
  const sample = await db.collection('tally_manual_vouchers').find({}).limit(3).toArray();
  sample.forEach((d, i) => {
    console.log(`Doc ${i}: _id=${d._id}, type=${typeof d._id}, constructor=${d._id.constructor.name}, voucher=${d.voucherNumber}`);
  });
  
  await client.close();
})();
